import Grid from "../src/components/grid"
import React, {ReactNode, MouseEvent, useCallback, useEffect, useMemo, useState} from "react"
import init_apvd, {Circle, Diagram, Dual, Error, init_logs, R2, train} from "apvd"
import {Edge, Model, Region, Step} from "../src/lib/regions"
import * as apvd from "apvd"
import css from "./circles.module.scss"
import A from "next-utils/a"
import dynamic from "next/dynamic"
import {Sparklines, SparklinesLine} from 'react-sparklines'
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import {makeModel} from "../src/lib/regions";
import {fromEntries} from "next-utils/objs";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

const { min, max, PI, round, sqrt } = Math

const clamp = (v: number, m: number, M: number): number => max(m, min(M, v))

type C = Circle<number> & { name: string, color: string }
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
    { sets: "0**", value: PI },
    { sets: "*1*", value: PI },
    { sets: "**2", value: PI },
    { sets: "01*", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "0*2", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "*12", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "012", value: PI/2 - sqrt(3)/2 },
]

const FizzBuzz: Target[] = [
    { sets: "0*", value: 1/3 },
    { sets: "*1", value: 1/5 },
    { sets: "01", value: 1/15 },
]

const FizzBuzzBazz: Target[] = [
    { sets: "0**", value: 1/3 },
    { sets: "*1*", value: 1/5 },
    { sets: "**2", value: 1/7 },
    { sets: "01*", value: 1/15 },
    { sets: "0*2", value: 1/21 },
    { sets: "*12", value: 1/35 },
    { sets: "012", value: 1/105 },
]

type Target = {
    sets: string
    value: number
}

export type CircleCoord = 'x' | 'y' | 'r'
export type CircleGetter<T> = (c: Circle<T>) => T
export type CircleGetters<T> = { [k in CircleCoord]: CircleGetter<T> }
const CircleCoords: CircleCoord[] = [ 'x', 'y', 'r' ]
export function CircleGetters<T>(): CircleGetters<T> {
    return {
        'x': c => c.c.x,
        'y': c => c.c.y,
        'r': c => c.r,
    }
}
export const CircleFloatGetters = CircleGetters<number>()
export const CircleDualGetters = CircleGetters<Dual>()

export type VarCoord = [ number, CircleCoord ]
export type StepVarGetter = (step: Step, varIdx: number) => number

export type Vars = {
    allCoords: CircleCoord[][]
    skipVars: CircleCoord[][]
    vars: CircleCoord[][]
    numCoords: number
    numVars: number
    numSkipVars: number
    coords: VarCoord[]
    getVal: StepVarGetter
}
export type RunningState = "none" | "fwd" | "rev"

export default function Page() {
    const scale = 130
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(400);
    const projection = { x: -scale / 2, y: scale / 2, s: scale }
    const gridSize = 1
    const [ targets, setTargets ] = useState<Target[]>(ThreeEqualCircles)
    const numCircles = useMemo(() => targets[0].sets.length, [ targets ])
    const wasmTargets = useMemo(
        () => targets.map(({ sets, value }) => [ sets, value ]),
        [ targets ],
    )
    const [ showGrid, setShowGrid ] = useState(false)
    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useState(0.7)
    const [ maxSteps, setMaxSteps ] = useState(1000)
    const [ stepBatchSize, setStepBatchSize ] = useState(10)

    const [ apvdInitialized, setApvdInitialized ] = useState(false)

    const [ model, setModel ] = useState<Model | null>(null)
    // const minIdx = useMemo(() => model ? model.min_idx : null, [ model ])
    const [ modelStepIdx, setModelStepIdx ] = useState<number | null>(null)
    const [ vStepIdx, setVStepIdx ] = useState<number | null>(null)
    const [ runningState, setRunningState ] = useState<RunningState>("none")
    const [ frameLen, setFrameLen ] = useState(0)

    const [ stepIdx, setStepIdx ] = useMemo(
        () => {
            return [
                vStepIdx !== null ? vStepIdx : modelStepIdx,
                (stepIdx: number) => {
                    setModelStepIdx(stepIdx)
                    setVStepIdx(null)
                },
            ]
        },
        [ modelStepIdx, setModelStepIdx, vStepIdx, setVStepIdx, ]
    )

    const curStep: Step | null = useMemo(
        () => (!model || stepIdx === null) ? null : model.steps[stepIdx],
        [ model, stepIdx ],
    )

    const prvStep: Step | null = useMemo(
        () => (!model || stepIdx === null || stepIdx === 0) ? null : model.steps[stepIdx - 1],
        [ model, stepIdx ],
    )

    const [ initialLayout, setInitialLayout] = useState<InitialLayout>(OriginRightUp)
    const initialCircles: C[] = useMemo(
        () => initialLayout.slice(0, numCircles).map(({ x, y, r }, idx) =>
            ({
                idx,
                c: { x, y }, r,
                name: String.fromCharCode('A'.charCodeAt(0) + idx),
                color: colors[idx],
            })
        ),
        [ numCircles, initialLayout, ],
    )

    const circles: C[] = useMemo(
        () => {
            if (!curStep) return initialCircles.slice(0, numCircles)
            return (
                curStep
                    .regions
                    .shapes
                    .map((c: Circle<number>, idx: number) => (
                        { ...initialCircles[idx], ...c, }
                    ))
            )
        },
        [ curStep, initialCircles, numCircles ]
    )

    const vars: Vars = useMemo(
        () => {
            const allCoords: CircleCoord[][] = new Array(numCircles).fill(CircleCoords)
            const numCoords = ([] as string[]).concat(...allCoords).length
            const skipVars: CircleCoord[][] = [ CircleCoords, ['y'], ]
            const numSkipVars = ([] as string[]).concat(...skipVars).length
            const numVars = numCoords - numSkipVars
            const vars = allCoords.map(
                (circleVars, idx) =>
                    circleVars.filter(v =>
                        !(skipVars[idx] || []).includes(v)
                    )
            )
            const coords: VarCoord[] = []
            vars.forEach((circleVars, circleIdx) => {
                circleVars.forEach(circleVar => {
                    coords.push([ circleIdx, circleVar ])
                })
            })
            function getVal(step: Step, varIdx: number): number {
                const [ circleIdx, circleCoord ] = coords[varIdx]
                const circleGetter = CircleFloatGetters[circleCoord]
                return circleGetter(step.regions.shapes[circleIdx])
            }
            return {
                allCoords,
                numCoords,
                skipVars,
                numSkipVars,
                vars,
                numVars,
                coords,
                getVal,
            }
        },
        [ numCircles ],
    )

    // Initialize wasm library, logging
    useEffect(
        () => {
            init_apvd().then(() => {
                init_logs(null)
                setApvdInitialized(true)
            })
        },
        []
    );

    // Initialize model, stepIdx
    useEffect(
        () => {
            if (!apvdInitialized) return
            // Naively, n circles have 3n degrees of freedom. However, WLOG, we can fix:
            // - c0 to be a unit circle at origin (x = y = 0, r = 1)
            // - c1.y = 0 (only x and r can move)
            // resulting in 4 fewer free variables.
            let curIdx = 0
            const { numVars, skipVars } = vars
            const inputs = circles.map((c: Circle<number>, idx: number) => {
                return [
                    c,
                    CircleCoords.map(v => {
                        const row = new Array(numVars).fill(0)
                        if (!(idx < skipVars.length && skipVars[idx].includes(v))) {
                            row[curIdx] = 1
                            curIdx += 1
                        }
                        return row
                    }),
                ]
            })
            console.log("inputs:", inputs)
            const model = makeModel(apvd.make_model(inputs, wasmTargets))
            console.log("new model:", model)
            setModel(model)
            setStepIdx(0)
        },
        [ apvdInitialized, vars, ]
    )

    const fwdStep = useCallback(
        (n?: number) => {
            if (!model || stepIdx === null) return
            if (stepIdx >= maxSteps) {
                console.log("maxSteps reached, not running step")
                setRunningState("none")
                return
            }
            let batchSize
            if (n === undefined) {
                n = stepIdx + 1 == model.steps.length ? stepBatchSize : 1
                batchSize = stepBatchSize
            } else {
                batchSize = stepIdx + n + 1 - model.steps.length
            }
            if (stepIdx + n < model.steps.length) {
                // "Fast-forward" without any new computation
                setStepIdx(stepIdx + n)
                console.log("bumping stepIdx to", stepIdx + n)
                return
            }
            if (model.repeat_idx) {
                // Don't advance past repeat_idx
                setStepIdx(model.steps.length - 1)
                console.log(`bumping stepIdx to ${model.steps.length - 1} due to repeat_idx ${model.repeat_idx}`)
                return
            }
            if (stepIdx + n > maxSteps) {
                n = maxSteps - stepIdx
                batchSize = n
                console.log(`Clamping advance to ${n} steps due to maxSteps ${maxSteps}`)
            }

            const lastDiagram: Diagram = model.lastDiagram
            const batchSeed: apvd.Model = {
                steps: [ lastDiagram ],
                repeat_idx: null,
                min_idx: 0,
                min_error: lastDiagram.error.v,
            }
            const batch = makeModel(train(batchSeed, maxErrorRatioStepSize, batchSize))
            const batchMinStep = batch.steps[batch.min_idx]
            const modelMinStep = model.steps[model.min_idx]
            const steps = model.steps.concat(batch.steps.slice(1))
            const [ min_idx, min_error ] = (batchMinStep.error.v < modelMinStep.error.v) ?
                [ batch.min_idx + model.steps.length - 1, batchMinStep.error.v ] :
                [ model.min_idx, model.min_error ]
            const newModel: Model = {
                steps,
                repeat_idx: batch.repeat_idx ? batch.repeat_idx + model.steps.length - 1 : null,
                min_idx,
                min_error,
                lastDiagram: batch.lastDiagram,
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

    const cantAdvance = useMemo(
        () => !apvdInitialized || (model && model.repeat_idx && stepIdx == model.steps.length - 1) || stepIdx == maxSteps,
        [ apvdInitialized, model, stepIdx, maxSteps ],
    )

    const cantReverse = useMemo(
        () => !apvdInitialized || stepIdx === 0,
        [ apvdInitialized, stepIdx ],
    )

    // Keyboard shortcuts
    useEffect(() => {
        const keyDownHandler = (e: KeyboardEvent) => {
            // console.log(`keydown: ${e.code}, shift ${e.shiftKey}, alt ${e.altKey}, meta ${e.metaKey}`)
            switch (e.code) {
                case 'ArrowRight':
                    e.preventDefault()
                    e.stopPropagation()
                    if (cantAdvance) return
                    if (e.metaKey) {
                        if (model) {
                            setStepIdx(model.steps.length - 1)
                        }
                    } else {
                        fwdStep(e.shiftKey ? 10 : undefined)
                    }
                    break
                case 'ArrowLeft':
                    e.preventDefault()
                    e.stopPropagation()
                    if (cantReverse) return
                    if (e.metaKey) {
                        setStepIdx(0)
                    } else {
                        revStep(e.shiftKey ? 10 : 1)
                    }
                    break
                case 'Space':
                    e.preventDefault()
                    e.stopPropagation()
                    if (e.shiftKey) {
                        if (cantReverse) return
                        setRunningState(runningState == "rev" ? "none" : "rev")
                    } else {
                        if (cantAdvance) return
                        setRunningState(runningState == "fwd" ? "none" : "fwd")
                    }
                    break
            }
        }
        document.addEventListener("keydown", keyDownHandler);

        // clean up
        return () => {
            document.removeEventListener("keydown", keyDownHandler);
        };
    }, [ fwdStep, revStep, cantAdvance, cantReverse, setRunningState, runningState, ]);

    // Run steps
    useEffect(
        () => {
            if (runningState == 'none') return
            if (!model || stepIdx === null) return
            let step: () => void
            const expectedDirection = runningState
            if (runningState == 'fwd') {
                if (model.repeat_idx && stepIdx + 1 == model.steps.length) {
                    console.log(`effect: found repeat_idx ${model.repeat_idx}, not running steps`)
                    setRunningState("none")
                    return
                }
                step = fwdStep
            } else {
                if (stepIdx === 0) {
                    console.log(`effect: at step 0, not running steps`)
                    setRunningState("none")
                    return
                }
                step = revStep
            }
            console.log(`scheduling ${runningState} step ${stepIdx}`)
            const timer = setTimeout(
                () => {
                    if (runningState == expectedDirection) {
                        console.log(`running ${expectedDirection} step from ${stepIdx}`)
                        step()
                    } else {
                        console.log(`skipping ${expectedDirection} from step ${stepIdx}, runningSteps is ${runningState}`)
                    }
                },
                frameLen,
            );
            return () => clearTimeout(timer);
        },
        [ runningState, model, stepIdx, fwdStep, ],
    )

    // tsify `#[declare]` erroneously emits Record<K, V> instead of Map<K, V>: https://github.com/madonoharu/tsify/issues/26
    const errors = useMemo(
        () => curStep ? (curStep.errors as any as Map<string, Error>) : null,
        [ curStep, ],
    )
    const getErrors = useCallback(
        (step: Step) => step.errors as any as Map<string, Error>,
        [],
    )
    const getError = useCallback(
        (step: Step, sets: string) => getErrors(step).get(sets),
        [ getErrors, ],
    )

    const error = useMemo(() => curStep?.error, [ curStep ])

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

    const repeatSteps = useMemo(
        () => {
            if (!model || !model.repeat_idx || stepIdx === null) return null
            return [ model.repeat_idx, model.steps.length - 1 ]
        },
        [ model, stepIdx ],
    )

    const [ plotInitialized, setPlotInitialized ] = useState(false)
    const plot = useMemo(
        () => {
            if (!model || stepIdx === null) return
            const steps = model.steps
            return <>
                <Plot
                    className={css.plot}
                    style={plotInitialized ? {} : { display: "none", }}
                    data={[
                        {
                            // x: steps.map((_: Diagram, idx: number) => xlo + idx),
                            y: steps.map(step => step.error.v),
                            type: 'scatter',
                            mode: 'lines',
                            marker: { color: 'red' },
                        },
                    ]}
                    layout={{
                        dragmode: 'pan',
                        hovermode: 'x',
                        margin: { t: 0, l: 40, r: 0, b: 40, },
                        xaxis: {
                            title: 'Step',
                            rangemode: 'tozero',
                            // range: [ xlo, xhi ],
                        },
                        yaxis: {
                            title: 'Error',
                            type: 'log',
                            fixedrange: true,
                            rangemode: 'tozero',
                            // ...yAxis,
                            // range: [-10, 10],
                        },
                        shapes: /*stepIdx + 1 < model.steps.length ?*/ [{
                            type: 'line',
                            x0: stepIdx,
                            x1: stepIdx,
                            xref: 'x',
                            y0: 0,
                            y1: 1,
                            yref: 'paper',
                            fillcolor: 'grey',
                        }] /*: []*/
                    }}
                    config={{ displayModeBar: false, /*scrollZoom: true,*/ responsive: true, }}
                    onInitialized={() => {
                        console.log("plot initialized")
                        setPlotInitialized(true)
                    }}
                    onRelayout={(e: any) => {
                        console.log("relayout:", e)
                    }}
                    onHover={(e: any) => {
                        const vStepIdx = round(e.xvals[0])
                        // console.log("hover:", e, vStepIdx)
                        setVStepIdx(vStepIdx)
                    }}
                />
                {!plotInitialized &&
                    <div className={css.plot}>
                        Loading plot...
                    </div>
                }
            </>
        },
        [ model, stepIdx, plotInitialized, ],
    )

    const targetName = useCallback(
        (sets: string) => <>{
            sets.split('').map((ch: string, idx: number) => {
                if (ch === '*') {
                    return <span key={idx}></span>
                } else if (ch == '-') {
                    return <span key={idx} style={{ textDecoration: "line-through", }}>{circles[idx].name}</span>
                } else {
                    return <span key={idx}>{circles[idx].name}</span>
                }
            })
        }</>,
        [ circles, ],
    )

    const [ sparkLineLimit, setSparkLineLimit ] = useState(20)
    const [ sparkLineStrokeWidth, setSparkLineStrokeWidth ] = useState(1)
    const [ sparkLineMargin, setSparkLineMargin ] = useState(1)
    const [ sparkLineWidth, setSparkLineWidth ] = useState(80)
    const [ sparkLineHeight, setSparkLineHeight ] = useState(30)
    const SparkNum = useCallback(
        (v: number | null | undefined) => <td className={css.sparkNum}>
            <span>{v === null || v === undefined ? '' : v.toPrecision(4)}</span>
        </td>,
        [],
    )
    const SparkLineCell = useCallback(
        (
            varIdx: number,
            color: string,
            fn: (step: Step) => number,
        ) => <td>{
            model && stepIdx !== null &&
            <Sparklines
                data={
                    model
                        .steps
                        .slice(
                            max(0, stepIdx - sparkLineLimit),
                            stepIdx + 1
                        )
                        .map(fn)
                }
                limit={sparkLineLimit}
                width={40} height={20}
                svgWidth={sparkLineWidth} svgHeight={sparkLineHeight}
                margin={sparkLineMargin}
            >
                <SparklinesLine
                    color={color}
                    style={{strokeWidth: sparkLineStrokeWidth,}}
                    // onMouseMove={(e, v, { x, y }) => {
                    //     console.log("sparkline mousemove:", e, v, x, y)
                    // }}
                />
            </Sparklines>
        }</td>,
        [ model, stepIdx, ]
    )

    const getSliderValue = useCallback(
        (e: MouseEvent<HTMLInputElement>) => {
            const target = e.target as HTMLInputElement
            const [ m , M ] = [
                parseInt(target.getAttribute('min') || '0', 10),
                parseInt(target.getAttribute('max') || '0', 10),
            ]
            return round(m + (M - m) * e.nativeEvent.offsetX / target.clientWidth)
        },
        []
    )

    const col5 = "col"
    const col7 = "col"
    const col6 = "col"
    const col12 = "col-12"

    const PlaybackControl = useCallback(
        ({ title, hotkey, onClick, disabled, children }: {
            title: string
            hotkey: string
            onClick: () => void
            disabled: boolean
            children?: ReactNode
        }) => {
            title = `${title} (${hotkey})`
            return <OverlayTrigger overlay={<Tooltip>{title}</Tooltip>}>
                <span>
                    <Button
                        title={title}
                        onClick={onClick}
                        disabled={disabled}>
                        {children}
                    </Button>
                </span>
            </OverlayTrigger>
        },
        [],
    )

    const getCirclePointAtTheta = useCallback(
        (c: Circle<number>, theta: number): R2<number> => ({
            x: c.c.x + c.r * Math.cos(theta),
            y: c.c.y + c.r * Math.sin(theta),
        }),
        []
    )

    const getMidpoint = useCallback(
        ({ c, t0, t1 }: Edge, f: number = 0.5) =>
            getCirclePointAtTheta(
                c,
                t0 * (1 - f) + f * t1,
            ),
        []
    )

    const getEdgeLength = useCallback(({ c, t0, t1 }: Edge) => c.r * (t1 - t0), [])

    const getRegionCenter = useCallback(
        ({ segments }: Region, fs: number[]) => {
            fs = fs || [ 0.5 ]
            let totalWeight = 0
            const points = ([] as { point: R2<number>, weight: number }[]).concat(
                ...segments.map(({ edge }) => {
                    const weight = getEdgeLength(edge)
                    // const weight = 1
                    return fs.map(f => {
                        totalWeight += weight
                        return { point: getMidpoint(edge, f), weight }
                    })
                }),
            )
            return {
                x: points.map(({ point: { x }, weight }) => weight * x).reduce((a,b)=>a+b) / totalWeight,
                y: points.map(({ point: { y }, weight }) => weight * y).reduce((a,b)=>a+b) / totalWeight,
            }
        },
        []
    )

    const fs = [ 0.25, 0.5, 0.75, ];
    // const fs = [ 0.5, ];

    const circleNodes = useMemo(
        () => circles.map(({ c: { x, y }, r, name, color }: C, idx: number) =>
            <circle
                key={idx}
                cx={x}
                cy={y}
                r={r}
                stroke={"black"}
                strokeWidth={3 / scale}
                fill={color}
                fillOpacity={0.3}
            />
        ),
        [ circles, scale ],
    )

    const [ showEdgePoints, setShowEdgePoints ] = useState(false)
    const edgePoints = useMemo(
        () =>
            showEdgePoints && curStep && curStep.regions.edges.map((edge, idx) =>
                fs.map(f => {
                    const midpoint = getMidpoint(edge, f)
                    console.log("edge:", edge.c.idx, round(edge.t0 * 180 / PI), round(edge.t1 * 180 / PI), "midpoint:", midpoint)
                    return <circle
                        key={`${idx} ${f}`}
                        cx={midpoint.x}
                        cy={midpoint.y}
                        r={0.1}
                        stroke={"red"}
                        strokeWidth={1 / scale}
                        fill={"red"}
                        fillOpacity={0.5}
                    />
                })
            ),
        [ showEdgePoints, curStep, scale, ]
    )

    const expandedTargets = useMemo(
        () => {
            if (!apvdInitialized) return null
            return apvd.expand_areas(wasmTargets) as [ string, number ][]
        },
        [ apvdInitialized, wasmTargets, ]
    )

    const expandedTargetsMap = useMemo(
        () => expandedTargets ? fromEntries(expandedTargets) : null,
        [ expandedTargets ],
    )

    const [ hoveredRegion, setHoveredRegion ] = useState<string | null>(null)

    const [ showRegionLabels, setShowRegionLabels ] = useState(true)
    const regionLabels = useMemo(
        () =>
            showRegionLabels && curStep && curStep.regions.regions.map((region, idx) => {
                const center = getRegionCenter(region, fs)
                const containerIdxs = region.containers.map(({ idx }) => idx)
                containerIdxs.sort()
                const label = containerIdxs.map(idx => circles[idx].name).join('')
                const { key, area } = region
                const target = expandedTargetsMap && expandedTargetsMap[key]
                const tooltip = target ? `${label}: ${area.v.toPrecision(3)} ${target.toPrecision(3)}` : key
                // console.log("key:", key, "hoveredRegion:", hoveredRegion)
                return (
                    <OverlayTrigger key={key} show={key == hoveredRegion} overlay={<Tooltip onMouseOver={() => setHoveredRegion(key)}>{tooltip}</Tooltip>}>
                        <text
                            transform={`translate(${center.x}, ${center.y}) scale(1, -1)`}
                            textAnchor={"middle"}
                            dominantBaseline={"middle"}
                            fontSize={16 / scale}
                        >
                            {label}
                        </text>
                    </OverlayTrigger>
                )
            }),
        [ curStep, scale, showRegionLabels, hoveredRegion, ],
    )

    // console.log("expandedTargets:", expandedTargets)

    const regionPaths = useMemo(
        () =>
            curStep && curStep.regions.regions.map(({ key, segments, area, }, idx) => {
                let d = ''
                segments.forEach(({ edge, fwd }, idx) => {
                    const { c: { r }, i0, i1, t0, t1, } = edge
                    const [ start, end ] = fwd ? [ i0, i1 ] : [ i1, i0 ]
                    if (idx == 0) {
                        d = `M ${start.x.v} ${start.y.v}`
                    }
                    d += ` A ${r},${r} 0 ${t1 - t0 > PI ? 1 : 0} ${fwd ? 1 : 0} ${end.x.v},${end.y.v}`
                })
                const isHovered = hoveredRegion == key
                return (
                    <path
                        key={key}
                        d={d}
                        stroke={"black"}
                        strokeWidth={1 / scale}
                        fill={"grey"}
                        fillOpacity={isHovered ? 0.5 : 0}
                        onMouseOver={() => setHoveredRegion(key)}
                        // onMouseLeave={() => setHoveredRegion(null)}
                        onMouseOut={() => setHoveredRegion(null)}
                    />
                )
            }),
        [ curStep, scale, hoveredRegion, ],
    )

    return <>
        <div className={css.body}>
            <div className={`${css.row} ${css.content}`}>
                <Grid className={css.svg} projection={projection} width={width} height={height} gridSize={gridSize} showGrid={showGrid}>
                    <>
                        {circleNodes}
                        {edgePoints}
                        {regionLabels}
                        {regionPaths}
                    </>
                </Grid>
                <hr />
                <div className={"row"}>
                    <div className={`${col6} ${css.controlPanel}`}>
                        <div className={`${css.controls}`}>
                            <div className={css.slider}>{model && stepIdx !== null &&
                                <input
                                    type={"range"}
                                    value={stepIdx}
                                    min={0}
                                    max={model.steps.length - 1}
                                    onChange={e => setStepIdx(parseInt(e.target.value))}
                                    onMouseMove={e => {
                                        setVStepIdx(getSliderValue(e))
                                    }}
                                    onClick={e => {
                                        setStepIdx(getSliderValue(e))
                                    }}
                                    onMouseOut={() => {
                                        console.log("onMouseOut")
                                        setVStepIdx(null)
                                    }}
                                />
                            }</div>
                            <div className={`${css.buttons}`}>
                                <PlaybackControl title={"Reset to beginning"} hotkey={"⌘←"} onClick={() => setStepIdx(0)} disabled={cantReverse}>⏮️</PlaybackControl>
                                <PlaybackControl title={"Rewind"} hotkey={"⇧␣"} onClick={() => setRunningState(runningState == "rev" ? "none" : "rev")} disabled={cantReverse}>{runningState == "rev" ? "⏸️" : "⏪️"}</PlaybackControl>
                                <PlaybackControl title={"Reverse one step"} hotkey={"←"} onClick={() => revStep()} disabled={cantReverse}>⬅️</PlaybackControl>
                                <PlaybackControl title={"Advance one step"} hotkey={"→"} onClick={() => fwdStep()} disabled={cantAdvance || stepIdx == maxSteps}>➡️</PlaybackControl>
                                <PlaybackControl title={"Fast-forward"} hotkey={"␣"} onClick={() => setRunningState(runningState == "fwd" ? "none" : "fwd")} disabled={cantAdvance}>{runningState == "fwd" ? "⏸️" : "⏩"}</PlaybackControl>
                                <PlaybackControl title={"Seek to last computed step"} hotkey={"⌘→"} onClick={() => model && setStepIdx(model.steps.length - 1)} disabled={!model || stepIdx === null || stepIdx + 1 == model.steps.length}>⏭️</PlaybackControl>
                            </div>
                            <div className={css.stepStats}>
                                <p>Step {stepIdx}{ error && <span>, error: {error.v.toPrecision(3)}</span> }</p>
                                <p>{model && bestStep && <>
                                    Best step: {model.min_idx}, error: {bestStep.error.v.toPrecision(3)}
                                </>}</p>
                                {repeatSteps && stepIdx == repeatSteps[1] ?
                                    <p className={css.repeatSteps}>♻️ Step {repeatSteps[1]} repeats step {repeatSteps[0]}</p> :
                                    <p className={`${css.repeatSteps} ${css.invisible}`}>♻️ Step {"?"} repeats step {"?"}</p>
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`${col6} ${css.controlPanel}`}>
                        <div className={css.input}>
                            <label>Max error ratio step size: <input type={"number"} value={maxErrorRatioStepSize} onChange={(e) => setMaxErrorRatioStepSize(parseFloat(e.target.value))} /></label>
                        </div>
                        <div className={css.input}>
                            <label>Max steps: <input type={"number"} value={maxSteps} onChange={(e) => setMaxSteps(parseInt(e.target.value))} /></label>
                        </div>
                        <div className={css.input}>
                            <label>Step batch size: <input type={"number"} value={stepBatchSize} onChange={(e) => setStepBatchSize(parseInt(e.target.value))} /></label>
                        </div>
                        <div className={css.input}>
                            <label>Labels: <input type={"checkbox"} checked={showRegionLabels} onChange={e => setShowRegionLabels(e.target.checked)} /></label>
                        </div>
                    </div>
                </div>
                <hr />
                <div className={"row"}>
                    <div className={`${col7}`}>
                        <h3 className={css.tableTitle}>Targets</h3>
                        <table className={css.sparkLinesTable}>
                            <thead>
                            <tr>
                                <th></th>
                                <th>Goal</th>
                                {/*<th>Cur</th>*/}
                                <th style={{ textAlign: "center" }} colSpan={2}>Error</th>
                            </tr>
                            </thead>
                            <tbody>
                            {
                                targets.map(({ sets, value}, varIdx) => {
                                    const name = targetName(sets)
                                    const err = errors ? errors.get(sets) : null
                                    return <tr key={sets}>
                                        <td className={css.val}>{name}</td>
                                        <td className={css.val}>{value.toPrecision(3).replace(/\.?0+$/, '')}</td>
                                        {/*<td className={css.val}>{err ? (err.actual_frac.v * err.total_target_area).toPrecision(3) : ''}</td>*/}
                                        {SparkNum(err && err.error.v * err.total_target_area)}
                                        {SparkLineCell(varIdx, "red", step => getError(step, sets)?.error.v || 0)}
                                    </tr>
                                })
                            }
                            <tr>
                                <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold", }}>Overall:</td>
                                {SparkNum(error && curStep && error.v * curStep.total_target_area)}
                                {SparkLineCell(-1, "red", step => step.error.v)}
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className={col5}>
                        <h3 className={css.tableTitle}>Vars</h3>
                        <table className={css.sparkLinesTable}>
                            <thead>
                            <tr>
                                <th>Var</th>
                                <th colSpan={2} style={{ textAlign: "center", }}>Value</th>
                                <th colSpan={2} style={{ textAlign: "center", }}>Δ</th>
                            </tr>
                            </thead>
                            <tbody>{
                                vars.coords.map(([ circleIdx, circleCoord ], varIdx ) =>
                                    <tr key={varIdx}>
                                        <td>{circles[circleIdx].name}.{circleCoord}</td>
                                        {SparkNum(curStep && vars.getVal(curStep, varIdx))}
                                        {SparkLineCell(varIdx, "blue", step => vars.getVal(step, varIdx))}
                                        {SparkNum(error && -error.d[varIdx])}
                                        {SparkLineCell(varIdx, "green", step => step.error.d[varIdx])}
                                    </tr>
                                )
                            }</tbody>
                        </table>
                        <div className={css.tableBreak} />
                        <h3 className={css.tableTitle}>Shapes</h3>
                        <table>
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>x</th>
                                <th>y</th>
                                <th>r</th>
                            </tr>
                            </thead>
                            <tbody>{
                                circles.map(({ idx, c: { x, y }, r, name, }: C) =>
                                    <tr key={idx}>
                                        <td>{name}</td>
                                        <td>{x.toPrecision(4)}</td>
                                        <td>{y.toPrecision(4)}</td>
                                        <td>{r.toPrecision(4)}</td>
                                    </tr>
                                )
                            }</tbody>
                        </table>
                    </div>
                </div>
                <div className={"row"}>
                    <div
                        className={col7}
                        onMouseOut={e => {
                            console.log("onMouseOut:", e)
                            setVStepIdx(null)
                        }}
                    >
                        <h3 className={css.tableTitle}>Error</h3>
                        {plot}
                    </div>
                    <div className={col5}>
                    </div>
                </div>
                <hr />
                <div className={`row`}>
                    <div className={col12}>
                        <h3>Differentiable shape-intersection</h3>
                        <p>Given "target" values:</p>
                        <ul>
                            <li>Model each set with a circle</li>
                            <li>Compute intersections and areas (using "<A href={"https://en.wikipedia.org/wiki/Dual_number"}>dual numbers</A>" to preserve "forward-mode" derivatives)</li>
                            <li>Gradient-descend until areas match targets</li>
                        </ul>
                        <h4>See also</h4>
                        <ul>
                            <li><A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>: Rust implementation of differentiable shape-intersection</li>
                            <li><A href={"https://github.com/runsascoded/apvd"}>runsascoded/apvd</A>: this app</li>
                            <li><A href={"/"}>Ellipse-intersection demo</A> (non-differentiable)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </>
}
