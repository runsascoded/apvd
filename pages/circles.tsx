import Grid from "../src/components/grid";
import React, {ChangeEvent, Fragment, useCallback, useEffect, useMemo, useState} from "react";
import apvd, { init_logs, step as doStep, make_diagram as makeDiagram, make_model as makeModel, train, Circle, R2, Dual, Model, Error, Diagram } from "apvd";
import css from "./circles.module.scss"
import A from "next-utils/a";
import dynamic from "next/dynamic";
import {Sparklines, SparklinesLine} from 'react-sparklines';
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

const { ceil, floor, log, min, max, PI, round, sqrt } = Math

const clamp = (v: number, m: number, M: number): number => max(m, min(M, v))

type C = Circle<number> & { color: string }
const sq3 = sqrt(3)
const colors = [ 'green', 'orange', 'yellow', ]
export type InitialLayout = { x: number, y: number, r: number }[]
const SymmetricCircles: InitialLayout = [
    { x:   0, y:     0, r: 1, },
    { x:   1, y:     0, r: 1, },
    { x: 1/2, y: sq3/2, r: 1, },
]
const OriginRightUp: InitialLayout = [
    { x:   0, y: 0, r: 1, },
    { x:   1, y: 0, r: 1, },
    { x:   0, y: 1, r: 1, },
]

const ThreeEqualCircles: Target[] = [
    { name: "A", sets: "0**", value: PI },
    { name: "B", sets: "*1*", value: PI },
    { name: "C", sets: "**2", value: PI },
    { name: "A B", sets: "01*", value: 2*PI/3 - sqrt(3)/2 },
    { name: "A C", sets: "0*2", value: 2*PI/3 - sqrt(3)/2 },
    { name: "B C", sets: "*12", value: 2*PI/3 - sqrt(3)/2 },
    { name: "A B C", sets: "012", value: PI/2 - sqrt(3)/2 },
]

const FizzBuzz: Target[] = [
    { name: "Fizz", sets: "0*", value: 1/3 },
    { name: "Buzz", sets: "*1", value: 1/5 },
    { name: "Fizz Buzz", sets: "01", value: 1/15 },
]

const FizzBuzzBazz: Target[] = [
    { name: "Fizz", sets: "0**", value: 1/3 },
    { name: "Buzz", sets: "*1*", value: 1/5 },
    { name: "Bazz", sets: "**2", value: 1/7 },
    { name: "Fizz Buzz", sets: "01*", value: 1/15 },
    { name: "Fizz Bazz", sets: "0*2", value: 1/21 },
    { name: "Buzz Bazz", sets: "*12", value: 1/35 },
    { name: "Fizz Buzz Bazz", sets: "012", value: 1/105 },
]

type Target = {
    name: string
    sets: string
    value: number
}
export default function Page() {
    const scale = 130
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(400);
    const projection = { x: -scale / 2, y: scale / 2, s: scale }
    const gridSize = 1
    const [ targets, setTargets ] = useState<Target[]>(ThreeEqualCircles)
    const numCircles = useMemo(() => targets[0].sets.length, [ targets ])
    const wasmTargets = useMemo(
        () => targets.map(({ name, sets, value }) => [ sets, value ]),
        [ targets ],
    )
    const [ showGrid, setShowGrid ] = useState(false)
    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useState(0.7)
    const [ maxSteps, setMaxSteps ] = useState(1000)
    const [ stepBatchSize, setStepBatchSize ] = useState(10)
    const [ apvdInitialized, setApvdInitialized ] = useState(false)

    const [ model, setModel ] = useState<Model | null>(null)
    // const minIdx = useMemo(() => model ? model.min_idx : null, [ model ])
    const [ stepIdx, setStepIdx ] = useState<number | null>(null)
    const [ runningSteps, setRunningSteps ] = useState(false)
    const [ frameLen, setFrameLen ] = useState(0)

    const curStep: Diagram | null = useMemo(
        () => (!model || stepIdx === null) ? null : model.steps[stepIdx],
        [ model, stepIdx ],
    )

    const prvStep: Diagram | null = useMemo(
        () => (!model || stepIdx === null || stepIdx === 0) ? null : model.steps[stepIdx - 1],
        [ model, stepIdx ],
    )

    const [ initialLayout, setInitialLayout] = useState<InitialLayout>(OriginRightUp)
    const initialCircles: C[] = useMemo(
        () => initialLayout.slice(0, numCircles).map(({ x, y, r }, idx) =>
            ({ idx, c: { x, y }, r, color: colors[idx], })
        ),
        [ numCircles, initialLayout, ],
    )

    const circles = useMemo(
        () => {
            if (!curStep) return initialCircles.slice(0, numCircles)
            return (
                curStep
                    .shapes
                    .map((c: Circle<number>, idx: number) => (
                        {...c, color: initialCircles[idx].color}
                    ))
            )
        },
        [ curStep, initialCircles, numCircles ]
    )

    // Initialize wasm library, model
    useEffect(
        () => {
            apvd().then(() => {
                init_logs(null)
                setApvdInitialized(true)
                // Naively, n circles have 3n degrees of freedom. However, WLOG, we can fix:
                // - c0 to be a unit circle at origin (x = y = 0, r = 1)
                // - c1.y = 0 (only x and r can move)
                // resulting in 4 fewer free variables.
                const skipVars = [ [ 'x', 'y', 'r', ], ['y'], ]
                const numVars = 3 * circles.length - ([] as string[]).concat(...skipVars).length
                let curIdx = 0
                const inputs = circles.map((c: Circle<number>, idx: number) => {
                    return [
                        c,
                        'xyr'.split('').map(v => {
                            const row = new Array(numVars).fill(0)
                            if (idx >= skipVars.length || !skipVars[idx].includes(v)) {
                                row[curIdx] = 1
                                curIdx += 1
                            }
                            return row
                        }),
                    ]
                })
                console.log("inputs:", inputs)
                const model = makeModel(inputs, wasmTargets)
                console.log("new model:", model)
                setModel(model)
                setStepIdx(0)
            })
        },
        []
    );

    const fwdStep = useCallback(
        (n?: number) => {
            if (!model || stepIdx === null) return
            if (stepIdx >= maxSteps) {
                console.log("maxSteps reached, not running step")
                setRunningSteps(false)
                return
            }
            let batchSize = stepBatchSize
            if (n === undefined) {
                n = 1
            } else {
                batchSize = stepIdx + n + 1 - model.steps.length
            }
            if (stepIdx + n < model.steps.length) {
                setStepIdx(stepIdx + n)
                console.log("bumping stepIdx to", stepIdx + n)
                return
            }

            const lastStep: Diagram = model.steps[model.steps.length - 1]
            const batchSeed: Model = {
                steps: [ lastStep ],
                repeat_idx: null,
                min_idx: 0,
                min_error: lastStep.error.v,
            }
            const batch = train(batchSeed, maxErrorRatioStepSize, batchSize)
            const batchMinStep = batch.steps[batch.min_idx]
            const modelMinStep = model.steps[model.min_idx]
            const steps = model.steps.concat(batch.steps.slice(1))
            const [ min_idx, min_error ] = (batchMinStep.error.v < modelMinStep.error.v) ?
                [ batch.min_idx + model.steps.length - 1, batchMinStep.error.v ] :
                [ model.min_idx, model.min_error ]
            const newModel: Model = {
                steps,
                repeat_idx: batch.repeat_idx === undefined ? undefined : batch.repeat_idx + model.steps.length - 1,
                min_idx,
                min_error,
            }
            console.log("newModel:", newModel)
            setModel(newModel)
            setStepIdx(newModel.steps.length - 1)
        },
        [ model, maxErrorRatioStepSize, maxSteps, stepIdx, ]
    )

    const revStep = useCallback(
        (n?: number) => {
            if (stepIdx === null) return
            const newStepIdx = max(0, stepIdx - (n || 1))
            if (stepIdx > newStepIdx) {
                console.log("reversing stepIdx to", newStepIdx)
                setStepIdx(newStepIdx)
            }
        },
        [ stepIdx, ],
    )

    const runSteps = useCallback(
        () => {
            if (runningSteps) {
                setRunningSteps(false)
                return
            }
            if (!model || stepIdx === null) return
            if (model.repeat_idx !== undefined && stepIdx + 1 == model.steps.length) {
                console.log("runSteps: found repeat_idx, not running steps")
                setRunningSteps(false)
                return
            }
            setRunningSteps(true)
        },
        [ model, stepIdx, runningSteps ],
    )

    // Keyboard shortcuts
    useEffect(() => {
        const keyDownHandler = (e: KeyboardEvent) => {
            // console.log(`keydown: ${e.code}, shift ${e.shiftKey}, alt ${e.altKey}, meta ${e.metaKey}`)
            switch (e.code) {
                case 'ArrowRight':
                    if (e.metaKey) {
                        if (model) {
                            setStepIdx(model.steps.length - 1)
                        }
                    } else {
                        fwdStep(e.shiftKey ? 10 : 1)
                    }
                    break
                case 'ArrowLeft':
                    if (e.metaKey) {
                        setStepIdx(0)
                    } else {
                        revStep(e.shiftKey ? 10 : 1)
                    }
                    break
                case 'Space':
                    runSteps()
                    e.preventDefault()
                    e.stopPropagation()
                    break
            }
        }
        document.addEventListener("keydown", keyDownHandler);

        // clean up
        return () => {
            document.removeEventListener("keydown", keyDownHandler);
        };
    }, [ fwdStep, revStep, runSteps, ]);

    // Run steps
    useEffect(
        () => {
            if (!runningSteps) return
            if (!model || stepIdx === null) return
            if (model.repeat_idx !== undefined && stepIdx + 1 == model.steps.length) {
                console.log("effect: found repeat_idx, not running steps")
                setRunningSteps(false)
                return
            }
            console.log("scheduling step:", stepIdx)
            const timer = setTimeout(
                () => {
                    if (runningSteps) {
                        console.log('running step:', stepIdx)
                        fwdStep()
                    } else {
                        console.log("not running step:", stepIdx)
                    }
                },
                frameLen,
            );
            return () => clearTimeout(timer);
        },
        [ runningSteps, model, stepIdx, fwdStep, ],
    )

    // const handleTargetsChange = useCallback(
    //     (e: ChangeEvent<HTMLTextAreaElement>) => {
    //         const lines = e.target.value.split("\n")
    //         let newTargets: Target[] = []
    //         for (const line of lines) {
    //             const lineRegex = /(.+): (.+) \((.+)\)/
    //             const match = lineRegex.exec(line)
    //             if (!match) {
    //                 console.log("Malformed line:", line)
    //                 return
    //             }
    //             const [ name, sets, value] = match.slice(1)
    //             return { name, sets, value: parseFloat(value) }
    //         }
    //         setTargets(newTargets)
    //         if (stepIdx !== null && model && stepIdx < model.steps.length - 1) {
    //             const newModel = { ...model }
    //             newModel.steps = newModel.steps.slice(0, stepIdx + 1)
    //             setModel(newModel)
    //         }
    //     },
    //     [ model, stepIdx, ],
    // )

    // tsify `#[declare]` erroneously emits Record<K, V> instead of Map<K, V>: https://github.com/madonoharu/tsify/issues/26
    const errors = useMemo(
        () => curStep ? (curStep.errors as any as Map<string, Error>) : null,
        [ curStep, ],
    )
    const prvErrors = useMemo(
        () => prvStep ? (prvStep.errors as any as Map<string, Error>) : null,
        [ prvStep, ],
    )

    const error = useMemo(() => curStep?.error, [ curStep ])
    const prvError = useMemo(() => prvStep?.error, [ prvStep ])

    const bestStep = useMemo(
        () => {
            if (!model) return null
            return model.steps[model.min_idx]
        },
        [ model ],
    )
    // console.log("errors:", errors)
    // console.log(`render: ${model?.steps?.length} steps, idx ${stepIdx}`)

    // const basePath = getBasePath();

    const canAdvance = useMemo(
        () => apvdInitialized && (model && model.repeat_idx && stepIdx == model.steps.length - 1) || stepIdx == maxSteps,
        [ apvdInitialized, model, stepIdx, maxSteps ],
    )

    const canReverse = useMemo(
        () => apvdInitialized && stepIdx === 0,
        [ apvdInitialized, stepIdx ],
    )

    const repeatSteps = useMemo(
        () => {
            if (!model || !model.repeat_idx || stepIdx === null) return null
            return [ model.repeat_idx, model.steps.length - 1 ]
        },
        [ model, stepIdx ],
    )

    const [ plotXRange, setPlotXRange ] = useState<[number, number] | null>(null)

    const plot = useMemo(
        () => {
            if (!model || stepIdx === null) return
            const xlo = clamp(stepIdx - 10, 0, model.steps.length - 1)
            const xhi = stepIdx
            const steps = model.steps.slice(xlo, xhi)
            return <Plot
                data={[
                    {
                        x: steps.map((_: Diagram, idx: number) => xlo + idx),
                        y: steps.map((step: Diagram) => step.error.v),
                        type: 'scatter',
                        mode: 'lines',
                        marker: { color: 'red' },
                    },
                ]}
                layout={{
                    dragmode: 'pan',
                    hovermode: 'x',
                    xaxis: {
                        title: 'Step',
                        range: [ xlo, xhi ],
                    },
                    yaxis: {
                        title: 'Error',
                        type: 'log',
                        fixedrange: true,
                        // ...yAxis,
                        // range: [-10, 10],
                    },
                }}
                config={{ displayModeBar: false, /*scrollZoom: true,*/ responsive: true, }}
                onRelayout={(e: any) => {
                    console.log("relayout:", e)
                }}
                onHover={(e: any) => {
                    const stepIdx = round(e.xvals[0])
                    console.log("hover:", e, stepIdx)
                    setStepIdx(stepIdx)
                }}
            />
        },
        [ model, stepIdx, plotXRange, ],
    )

    return <>
        <div className={css.body}>
            <div className={`row ${css.row} ${css.content}`}>
                <Grid className={css.svg} projection={projection} width={width} height={height} gridSize={gridSize} showGrid={showGrid}>{
                    circles.map(({ c: { x, y }, r, color }: C, idx: number) =>
                        <circle key={idx} cx={x} cy={y} r={r} stroke={"black"} strokeWidth={3/scale} fill={color} fillOpacity={0.3} />)
                }</Grid>
                <hr />
                <div className={`row ${css.row} ${css.controlPanel}`}>
                    <div className={`row ${css.row} ${css.controls}`}>
                        <div className={`${css.buttons}`}>
                            <button title={"Reset to beginning"} onClick={() => setStepIdx(0)} disabled={canReverse}>⏮️</button>
                            <button title={"Reverse one step"} onClick={() => revStep()} disabled={canReverse}>⬅️</button>
                            <button title={"Advance one step"} onClick={() => fwdStep()} disabled={canAdvance || stepIdx == maxSteps}>➡️</button>
                            <button title={"Play steps"} onClick={() => runSteps()} disabled={canAdvance}>{runningSteps ? "⏸️" : "▶️"}</button>
                        </div>
                        <div className={css.stepStats}>
                            Step {stepIdx}
                            {
                                error &&
                                <span>
                                    , error: {error.v.toPrecision(3)},
                                    Δ: {
                                        error.d.map((d: number, idx: number) => {
                                            const grad = -d
                                            const className = prvError?.d ? prvError.d[idx] * d > 0 ? css.errSame : css.errFlipped : ""
                                            return <Fragment key={idx}>
                                                {idx > 0 ? ", " : ""}
                                                <span className={`${css.err} ${className}`}>{grad.toPrecision(3)}</span>
                                            </Fragment>
                                        })
                                    }
                                </span>
                            }
                        </div>
                        <div>{model && bestStep && <>
                            Best step: {model.min_idx}, error: {bestStep.error.v.toPrecision(3)}
                        </>}</div>
                        <div>
                            <label>Max error ratio step size: <input type={"number"} value={maxErrorRatioStepSize} onChange={(e) => setMaxErrorRatioStepSize(parseFloat(e.target.value))} /></label>
                        </div>
                        <div>
                            <label>Max steps: <input type={"number"} value={maxSteps} onChange={(e) => setMaxSteps(parseInt(e.target.value))} /></label>
                        </div>
                        <div>
                            <label>Step batch size: <input type={"number"} value={stepBatchSize} onChange={(e) => setStepBatchSize(parseInt(e.target.value))} /></label>
                        </div>
                        {repeatSteps && stepIdx == repeatSteps[1] &&
                            <div className={css.repeatSteps}>Step {repeatSteps[1]} repeats step {repeatSteps[0]}</div>
                        }
                    </div>
                </div>
                <hr />
                <div className={css.stats}>
                    <h3 className={css.tableLabel}>Targets</h3>
                    <table>
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Target</th>
                            <th>Proportion</th>
                            <th>Current</th>
                            <th>Error</th>
                        </tr>
                        </thead>
                        <tbody>{
                            targets.map(({name, sets, value}) => {
                                const err = errors ? errors.get(sets) : null
                                const prvErr = prvErrors ? prvErrors.get(sets) : null
                                const className = (err && prvErr) ? prvErr.error.v * err.error.v > 0 ? css.errSame : css.errFlipped : ""
                                return <tr key={name}>
                                    <td>{name}</td>
                                    <td>{value.toPrecision(3).replace(/\.?0+$/, '')}</td>
                                    <td>{err ? err.target_frac.toPrecision(3) : ''}</td>
                                    <td>{err ? err.actual_frac.v.toPrecision(3) : ''}</td>
                                    <td><span className={className}>{err ? err.error.v.toPrecision(3) : ''}</span></td>
                                </tr>
                            })
                        }</tbody>
                    </table>
                </div>
                <div className={`row ${css.row} ${css.stats}`}>
                    <h3 className={css.tableLabel}>Shapes</h3>
                    <table>
                        <thead>
                        <tr>
                            <th>cx</th>
                            <th>cy</th>
                            <th>r</th>
                        </tr>
                        </thead>
                        <tbody>{
                            circles.map(({ idx, c: { x, y }, r, color }: C) =>
                                <tr key={idx}>
                                    <td>{x.toPrecision(4)}</td>
                                    <td>{y.toPrecision(4)}</td>
                                    <td>{r.toPrecision(4)}</td>
                                </tr>
                            )
                        }</tbody>
                    </table>
                </div>
                <div className={`row ${css.row}`}>{
                    model && error && stepIdx !== null &&
                    error.d.map((d: number, idx: number) => {
                        const fn: (step: Diagram) => number = [
                            (model: Model) => (step: Diagram) => step.shapes[1].c.x,
                            (model: Model) => (step: Diagram) => step.shapes[1].r,
                            (model: Model) => (step: Diagram) => step.shapes[2].c.x,
                            (model: Model) => (step: Diagram) => step.shapes[2].c.y,
                            (model: Model) => (step: Diagram) => step.shapes[2].r,
                        ][idx](model)
                        const startIdx = max(0, stepIdx - 10)
                        const data = model.steps.slice(startIdx, stepIdx + 1).map((step: Diagram) => fn(step))
                        return <Sparklines key={idx} data={data} limit={10} width={40} height={20} margin={1} style={{ width: "20%", height: 50, }}>
                            <SparklinesLine color="blue" style={{ strokeWidth: 1, }} />
                        </Sparklines>
                    })
                }</div>
                <div className={`row ${css.row}`}>{
                    model && error && stepIdx !== null &&
                    error.d.map((d: number, idx: number) => {
                        const startIdx = max(0, stepIdx - 10)
                        const data = model.steps.slice(startIdx, stepIdx + 1).map((step: Diagram) => step.error.d[idx])
                        // console.log(`sparkline ${idx}:`, data)
                        return <Sparklines key={idx} data={data} limit={10} width={40} height={20} margin={1} style={{ width: "20%", height: 50, }}>
                            <SparklinesLine color="red" style={{ strokeWidth: 1, }} />
                        </Sparklines>
                    })
                }</div>
                <div className={`row ${css.row}`}>{plot}</div>
                <hr />
                <div className={`row ${css.row}`}>
                    <h2>Differentiable shape-intersection</h2>
                    <p>Given "target" proportions (in this case, <A href={"https://en.wikipedia.org/wiki/Fizz_buzz"}>Fizz Buzz</A>: 1/3 Fizz, 1/5 Buzz, 1/15 Fizz Buzz)</p>
                    <ul>
                        <li>Model each set with a circle</li>
                        <li>Compute intersections and areas (using "<A href={"https://en.wikipedia.org/wiki/Dual_number"}>dual numbers</A>" to preserve "forward-mode" derivatives)</li>
                        <li>Gradient-descend until areas match targets</li>
                    </ul>
                    <p>See also:</p>
                    <ul>
                        <li><A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>: Rust implementation of differentiable shape-intersection</li>
                        <li><A href={"https://github.com/runsascoded/apvd"}>runsascoded/apvd</A>: this app</li>
                        <li><A href={"/"}>Ellipse-intersection demo</A> (non-differentiable)</li>
                    </ul>
                </div>
            </div>
        </div>
    </>
}
