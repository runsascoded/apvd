import Grid from "../src/components/grid";
import {ChangeEvent, useCallback, useEffect, useMemo, useState} from "react";
import apvd, { init_logs, step as doStep, make_diagram as makeDiagram, make_model as makeModel, train, Circle, R2, Dual, Model, Diagram } from "apvd";
import {Point} from "../src/components/point";
import css from "./circles.module.scss"

const { stringify } = JSON

type C = Circle<number> & { color: string }
const initialCircles: C[] = [
    { idx: 0, c: { x: 0, y: 0 }, r: 1, color: 'green' },
    { idx: 1, c: { x: 1, y: 0 }, r: 1, color: 'orange' },
]

type Target = {
    name: string
    sets: string
    value: number
}
export default function Page() {
    const scale = 200
    const projection = { x: -scale / 2, y: 0, s: scale }
    const gridSize = 1
    // const [ circles, setCircles ] = useState(initialCircles)
    const [ targets, setTargets ] = useState<Target[]>(
        [
            { name: "Fizz", sets: "0*", value: 1/3 },
            { name: "Buzz", sets: "*1", value: 1/5 },
            { name: "Fizz Buzz", sets: "01", value: 1/15 },
        ]
    )
    const wasmTargets = useMemo(
        () => targets.map(({ name, sets, value }) => [ sets, value ]),
        [ targets ],
    )
    const [ showGrid, setShowGrid ] = useState(false)
    const [ stepSize, setStepSize ] = useState(0.05)
    const [ maxSteps, setMaxSteps ] = useState(100)
    const [ apvdInitialized, setApvdInitialized ] = useState(false)

    // const [ diagram, setDiagram ] = useState<Diagram | null>(null)
    const [ model, setModel ] = useState<Model | null>(null)
    const minIdx = useMemo(() => model ? model.min_idx : null, [ model ])
    const [ stepIdx, setStepIdx ] = useState<number | null>(null)
    const [ runningSteps, setRunningSteps ] = useState(false)
    const [ frameLen, setFrameLen ] = useState(50)

    // Initialize wasm library, diagram
    useEffect(
        () => {
            // init_logs()
            apvd().then(() => {
                init_logs(null)
                setApvdInitialized(true)
                const [ c0, c1 ] = circles
                const inputs = [
                    [ c0, [ [ 0, 0 ], [ 0, 0 ], [0, 0 ] ] ],
                    [ c1, [ [ 1, 0 ], [ 0, 0 ], [0, 1 ] ] ],
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
            if (stepIdx < model.steps.length - 1) {
                setStepIdx(stepIdx + 1)
                console.log("bumping stepIdx to", stepIdx + 1)
                return
            }
            const newModel = train(model, stepSize, 1)
            console.log("newModel:", newModel)
            setModel(newModel)
            setStepIdx(newModel.steps.length - 1)
        },
        [ model, stepSize, maxSteps, stepIdx, ]
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
            if (!model || stepIdx === null) return
            if (model.repeat_idx !== undefined && stepIdx + 1 == model.steps.length) {
                console.log("runSteps: found repeat_idx, not running steps")
                setRunningSteps(false)
                return
            }
            setRunningSteps(true)
        },
        [ model, stepSize, maxSteps, stepIdx, ],
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
                    console.log('running step:', stepIdx)
                    fwdStep()
                },
                frameLen,
            );
            return () => clearTimeout(timer);
        },
        [ runningSteps, model, stepIdx, fwdStep, ],
    )

    const handleTargetsChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            const lines = e.target.value.split("\n")
            let newTargets: Target[] = []
            for (const line of lines) {
                const lineRegex = /(.+): (.+) \((.+)\)/
                const match = lineRegex.exec(line)
                if (!match) {
                    console.log("Malformed line:", line)
                    return
                }
                const [ name, sets, value] = match.slice(1)
                return { name, sets, value: parseFloat(value) }
            }
            setTargets(newTargets)
            if (stepIdx !== null && model && stepIdx < model.steps.length - 1) {
                const newModel = { ...model }
                newModel.steps = newModel.steps.slice(0, stepIdx + 1)
                setModel(newModel)
            }
        },
        [ model, stepIdx, ],
    )

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
        () => curStep ? curStep.errors : null,
        [ curStep, ],
    )

    const error = useMemo(() => curStep?.error, [ curStep ])
    // console.log("errors:", errors)
    // console.log(`render: ${model?.steps?.length} steps, idx ${stepIdx}`)

    return <div className={"row"}>
        <div className={css.gridContainer}>
            <Grid projection={projection} gridSize={gridSize} showGrid={showGrid} width={800} height={600}>{
                circles.map(({ c: { x, y }, r, color }: C, idx: number) =>
                    <circle key={idx} cx={x} cy={y} r={r} stroke={"black"} strokeWidth={3/scale} fill={color} fillOpacity={0.3} />)
            }</Grid>
        </div>
        <div className={`row ${css.controls}`}>
            <div className={"col-4"}>
                <button title={"Reset to beginning"} onClick={() => setStepIdx(0)} disabled={!apvdInitialized}>⏮️</button>
                <button title={"Reverse one step"} onClick={() => revStep()} disabled={!apvdInitialized}>⬅️</button>
                <button title={"Advance one step"} onClick={() => fwdStep()} disabled={!apvdInitialized}>➡️</button>
                <button title={"Play steps"} onClick={() => runSteps()} disabled={!apvdInitialized}>{runningSteps ? "⏸️" : "▶️"}</button>
                <label>
                    <input className={css.checkbox} type={"checkbox"} checked={showGrid} onChange={() => setShowGrid(!showGrid)} />
                    Show grid
                </label>
            </div>
            <div className={"col-4"}>
                <label>Step {stepIdx}, error: {error?.v?.toPrecision(3)}</label>
                <div>
                    <span className={css.tableLabel}>Targets:</span>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Target</th>
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
        </div>
    </div>
}
