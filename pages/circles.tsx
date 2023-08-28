import Grid from "../src/components/grid";
import {useCallback, useEffect, useMemo, useState} from "react";
import apvd, { init_logs, step as doStep, make_diagram as makeDiagram, make_model as makeModel, train, Circle, R2, Dual, Model, Diagram } from "apvd";
import {Point} from "../src/components/point";

type C = Circle<number> & { color: string }
const initialCircles: C[] = [
    { idx: 0, c: { x: 0, y: 0 }, r: 1, color: 'green' },
    { idx: 1, c: { x: 1, y: 0 }, r: 1, color: 'orange' },
]
export default function Page() {
    const scale = 200
    const projection = { x: -scale / 2, y: 0, s: scale }
    const gridSize = 1
    // const [ circles, setCircles ] = useState(initialCircles)
    const [ targets, setTargets ] = useState(
        [
            [ "0*", 1/3  ],  // Fizz
            [ "*1", 1/5  ],  // Buzz
            [ "01", 1/15 ],  // Fizz Buzz
        ]
    )
    const [ stepSize, setStepSize ] = useState(0.1)
    const [ maxSteps, setMaxSteps ] = useState(100)
    const [ apvdInitialized, setApvdInitialized ] = useState(false)

    // const [ diagram, setDiagram ] = useState<Diagram | null>(null)
    const [ model, setModel ] = useState<Model | null>(null)
    const minIdx = useMemo(() => model ? model.min_idx : null, [ model ])
    const [ stepIdx, setStepIdx ] = useState<number | null>(null)
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
                const model = makeModel(inputs, targets)
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

    // console.log(`render: ${model?.steps?.length} steps, idx ${stepIdx}`)

    return <div className={"row"}>
        <div>
            <Grid projection={projection} gridSize={gridSize} showGrid={true} width={800} height={600}>{
                circles.map(({ c: { x, y }, r, color }: C, idx: number) =>
                    <circle key={idx} cx={x} cy={y} r={r} stroke={"black"} strokeWidth={3/scale} fill={color} fillOpacity={0.3} />)
            }</Grid>
        </div>
        <div className={"row"}>
            <div className={"col-4"}>
                <input type={"button"} value={"<"} onClick={() => revStep()} disabled={!apvdInitialized} />
                <input type={"button"} value={">"} onClick={() => fwdStep()} disabled={!apvdInitialized} />
            </div>
        </div>
    </div>
}
