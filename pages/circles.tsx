import Grid from "../src/components/grid";
import React, {ChangeEvent, useCallback, useEffect, useMemo, useState} from "react";
import apvd, { init_logs, step as doStep, make_diagram as makeDiagram, make_model as makeModel, train, Circle, R2, Dual, Model, Error, Diagram } from "apvd";
import css from "./circles.module.scss"
import Link from "next/link";
import {getBasePath} from "next-utils/basePath";
import A from "next-utils/a";

const { PI, sqrt } = Math

type C = Circle<number> & { color: string }
const initialCircles: C[] = [
    { idx: 0, c: { x: 0, y: 0 }, r: 1, color: 'green', },
    { idx: 1, c: { x: 1, y: 0 }, r: 1, color: 'orange', },
    { idx: 2, c: { x: 0, y: 1 }, r: 1, color: 'yellow', },
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
    const [ targets, setTargets ] = useState<Target[]>(
        [
            // { name: "Fizz", sets: "0**", value: 1/3 },
            // { name: "Buzz", sets: "*1*", value: 1/5 },
            // { name: "Bazz", sets: "**2", value: 1/7 },
            // { name: "Fizz Buzz", sets: "01*", value: 1/15 },
            // { name: "Fizz Bazz", sets: "0*2", value: 1/21 },
            // { name: "Buzz Bazz", sets: "*12", value: 1/35 },
            // { name: "Fizz Buzz Bazz", sets: "012", value: 1/105 },
            { name: "A", sets: "0**", value: PI },
            { name: "B", sets: "*1*", value: PI },
            { name: "C", sets: "**2", value: PI },
            { name: "A B", sets: "01*", value: 2*PI/3 - sqrt(3)/2 },
            { name: "A C", sets: "0*2", value: 2*PI/3 - sqrt(3)/2 },
            { name: "B C", sets: "*12", value: 2*PI/3 - sqrt(3)/2 },
            { name: "A B C", sets: "012", value: PI/2 - sqrt(3)/2 },
        ]
    )
    const wasmTargets = useMemo(
        () => targets.map(({ name, sets, value }) => [ sets, value ]),
        [ targets ],
    )
    const [ showGrid, setShowGrid ] = useState(false)
    const [ maxStepSize, setMaxStepSize ] = useState(0.01)
    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useState(0.7)
    const [ maxSteps, setMaxSteps ] = useState(1000)
    const [ stepBatchSize, setStepBatchSize ] = useState(10)
    const [ apvdInitialized, setApvdInitialized ] = useState(false)

    const [ model, setModel ] = useState<Model | null>(null)
    // const minIdx = useMemo(() => model ? model.min_idx : null, [ model ])
    const [ stepIdx, setStepIdx ] = useState<number | null>(null)
    const [ runningSteps, setRunningSteps ] = useState(false)
    const [ frameLen, setFrameLen ] = useState(0)

    // Initialize wasm library, diagram
    useEffect(
        () => {
            apvd().then(() => {
                init_logs(null)
                setApvdInitialized(true)
                const [ c0, c1, c2, ] = circles
                const inputs = [
                    [ c0, [ [ 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ], [0, 0, 0, 0, 0 ] ] ],
                    [ c1, [ [ 1, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0 ], [0, 1, 0, 0, 0 ] ] ],
                    [ c2, [ [ 0, 0, 1, 0, 0 ], [ 0, 0, 0, 1, 0 ], [0, 0, 0, 0, 1 ] ] ],
                ]
                const model = makeModel(inputs, wasmTargets)
                console.log("new model:", model)
                setModel(model)
                setStepIdx(0)
            })
        },
        []
    );

    const fwdStep = useCallback(
        () => {
            if (!model || stepIdx === null) return
            if (stepIdx >= maxSteps) {
                console.log("maxSteps reached, not running step")
                setRunningSteps(false)
                return
            }
            if (stepIdx < model.steps.length - 1) {
                setStepIdx(stepIdx + 1)
                console.log("bumping stepIdx to", stepIdx + 1)
                return
            }
            const lastStep: Diagram = model.steps[model.steps.length - 1]
            const batchSeed: Model = {
                steps: [ lastStep ],
                repeat_idx: null,
                min_idx: 0,
                min_error: lastStep.error.v,
            }
            const batch = train(batchSeed, maxStepSize, maxErrorRatioStepSize, stepBatchSize)
            const batchMinStep = batch.steps[batch.min_idx]
            const modelMinStep = model.steps[model.min_idx]
            const steps = model.steps.concat(batch.steps.slice(1))
            const [ min_idx, min_error ] = (batchMinStep.error.v < modelMinStep) ?
                [ batch.min_idx, batchMinStep.error.v ] :
                [ model.min_idx, model.min_error ]
            const newModel: Model = {
                steps,
                repeat_idx: batch.repeat_idx === undefined ? undefined : batch.repeat_idx + model.steps.length,
                min_idx,
                min_error,
            }
            console.log("newModel:", newModel)
            setModel(newModel)
            setStepIdx(newModel.steps.length - 1)
        },
        [ model, maxStepSize, maxErrorRatioStepSize, maxSteps, stepIdx, ]
    )

    const revStep = useCallback(
        () => {
            if (stepIdx === null) return
            if (stepIdx > 0) {
                console.log("reversing stepIdx to", stepIdx - 1)
                setStepIdx(stepIdx - 1)
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

    const circles = useMemo(
        () => {
            if (!model || stepIdx === null) return initialCircles
            return (
                model
                    .steps[stepIdx]
                    .shapes
                    .map((c: Circle<number>, idx: number) => (
                        {...c, color: initialCircles[idx].color}
                    ))
            )
        },
        [ model, initialCircles, stepIdx ]
    )

    const curStep = useMemo(
        () => (!model || stepIdx === null) ? null : model.steps[stepIdx],
        [ model, stepIdx ],
    )

    const errors = useMemo(
        // tsify `#[declare]` erroneously emits Record<K, V> instead of Map<K, V>: https://github.com/madonoharu/tsify/issues/26
        () => curStep ? (curStep.errors as any as Map<string, Error>) : null,
        [ curStep, ],
    )

    const error = useMemo(() => curStep?.error, [ curStep ])
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
                        <div className={css.stepStats}>Step {stepIdx} (max {maxSteps}), error: {error?.v?.toPrecision(3)}</div>
                        {repeatSteps && stepIdx == repeatSteps[1] &&
                            <div className={css.repeatSteps}>Step {repeatSteps[1]} repeats step {repeatSteps[0]}</div>
                        }
                    </div>
                </div>
                <hr />
                <div className={css.stats}>
                    <div>
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
                                    return <tr key={name}>
                                        <td>{name}</td>
                                        <td>{value.toPrecision(3).replace(/\.?0+$/, '')}</td>
                                        <td>{err ? err.target_frac.toPrecision(3) : ''}</td>
                                        <td>{err ? err.actual_frac.v.toPrecision(3) : ''}</td>
                                        <td>{err ? err.error.v.toPrecision(3) : ''}</td>
                                    </tr>
                                })
                            }</tbody>
                        </table>
                    </div>
                </div>
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
