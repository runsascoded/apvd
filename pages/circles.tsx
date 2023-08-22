import Grid from "../src/components/grid";
import {useState} from "react";

const initialCircles = [
    { x: 0, y: 0, r: 1, color: 'green' },
    { x: 1, y: 0, r: 1, color: 'orange' },
]
export default function Page() {
    const scale = 200
    const projection = { x: -100, y: 0, s: scale }
    const gridSize = 1
    const [ circles, setCircles ] = useState(initialCircles)
    return <div className={"row"}>
        <div>
            <Grid projection={projection} gridSize={gridSize} showGrid={true} width={800} height={600}>{
                circles.map((c, idx) =>
                    <circle key={idx} cx={c.x} cy={c.y} r={c.r} stroke={"black"} strokeWidth={3/scale} fill={c.color} fillOpacity={0.3} />)
            }</Grid>
        </div>
        <div className={"row"}>
            <input type={"button"} value={"Step"} />
        </div>
    </div>
}
