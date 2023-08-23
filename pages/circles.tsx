import Grid from "../src/components/grid";
import {useCallback, useEffect, useMemo, useState} from "react";
import apvd, { init_logs, step as doStep, make_diagram as makeDiagram, fit, Circle, R2, Dual, Model, Diagram } from "apvd";
import {Point} from "../src/components/point";

const initialCircles: Circle<number>[] = [
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

    const [ diagram, setDiagram ] = useState<Diagram | null>(null)
    // Initialize wasm library, diagram
    useEffect(
        () => {
            // init_logs()
            apvd().then(() => {
                // init_logs()
                setApvdInitialized(true)
                const [ c0, c1 ] = circles
                const inputs = [
                    [ c0, [ [ 0, 0 ], [ 0, 0 ], [0, 0 ] ] ],
                    [ c1, [ [ 1, 0 ], [ 0, 0 ], [0, 1 ] ] ],
                ]
                setDiagram(makeDiagram(inputs, targets))
            })
        },
        []
    );

    const circles = useMemo(
        () => diagram ? diagram.shapes.map((c, idx) => ({ ...c, color: initialCircles[idx].color })) : initialCircles,
        [ diagram, initialCircles ]
    )

    const step = useCallback(
        () => {
            const newDiagram = doStep(diagram, stepSize)
            console.log("newDiagram:", newDiagram)
            setDiagram(newDiagram)
        },
        [ diagram, stepSize, ]
    )

    return <div className={"row"}>
        <div>
            <Grid projection={projection} gridSize={gridSize} showGrid={true} width={800} height={600}>{
                circles.map(({ c: { x, y }, r, color }, idx) =>
                    <circle key={idx} cx={x} cy={y} r={r} stroke={"black"} strokeWidth={3/scale} fill={color} fillOpacity={0.3} />)
            }</Grid>
        </div>
        <div className={"row"}>
            <div className={"col-4"}>
                <input type={"button"} value={"Step"} onClick={() => step()} disabled={!apvdInitialized} />
            </div>
        </div>
    </div>
}
