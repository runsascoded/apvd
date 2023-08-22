import Grid from "../src/components/grid";
import {useCallback, useEffect, useState} from "react";
import apvd, { fit } from "apvd";
import {Point} from "../src/components/point";

type Circle = {
    c: Point
    r: number
    color: string
}
const initialCircles = [
    { c: { x: 0, y: 0 }, r: 1, color: 'green' },
    { c: { x: 1, y: 0 }, r: 1, color: 'orange' },
]
export default function Page() {
    const scale = 200
    const projection = { x: -100, y: 0, s: scale }
    const gridSize = 1
    const [ circles, setCircles ] = useState(initialCircles)
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

    const step = useCallback(
        () => {
            const [ c0, c1 ] = circles
            const model = fit(
                [
                    {
                        idx: 0,
                        c: {
                            x: { v: c0.c.x, d: [ 0, 0 ], },
                            y: { v: c0.c.y, d: [ 0, 0 ], },
                        },
                        r: { v: c0.r, d: [ 0, 0 ], },
                    }, {
                    idx: 1,
                    c: {
                        x: { v: c1.c.x, d: [ 1, 0 ], },
                        y: { v: c1.c.y, d: [ 0, 0 ], },
                    },
                    r: { v: c1.r, d: [ 0, 1 ], }
                }
                ],
                targets,
                stepSize,
                maxSteps,
            )
            console.log("model:", model)
            for (let idx in model.steps) {
                const step = model.steps[idx];
                const c1 = step.duals[1]
                const error = step.error
                console.log(`Step ${idx}:`, "err", error.v, `[${error.d.join(", ")}]`, `cx`, c1.c.x.v, "r", c1.r.v,)
            }
            const newCircles = model.min_step.shapes
            newCircles.forEach((c: Circle, idx: number) => {
                c.color = circles[idx].color
            })
            setCircles(newCircles)
        },
        [ circles, targets, stepSize, maxSteps, ]
    )

    // Initialize wasm library
    useEffect(() => { apvd().then(() => setApvdInitialized(true)) }, []);

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
