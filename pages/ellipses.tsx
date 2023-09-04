import Grid, {GridState} from "../src/components/grid";
import React, {useEffect} from "react";
import css from "./circles.module.scss"
import {Dual, R2, XYRR, xyrr_unit} from "apvd";
import Apvd from "../src/components/apvd";

export default function Page() {
    return <Apvd logLevel={"debug"}>{() => <Body />}</Apvd>
}

export function Body() {
    const gridState = GridState({
        center: { x: 0.5, y: 1 },
        scale: 100,
        width: 600,
        height: 600,
        showGrid: true,
    })
    useEffect(() => {

    }, []);
    const e: XYRR<Dual> = {
        c: { x: { v: 1, d: [1, 0, 0, 0] },
             y: { v: 1, d: [0, 1, 0, 0] }, },
        r: { x: { v: 2, d: [0, 0, 1, 0] },
             y: { v: 3, d: [0, 0, 0, 1] }, },
    }
    const points = xyrr_unit(e) as R2<Dual>[]
    console.log("points:", points)

    return <div className={css.body}>
        <div className={`${css.row} ${css.content}`}>
            <Grid className={css.svg} state={gridState}>
                <circle cx={0} cy={0} r={1} fill={"green"} fillOpacity={0.3} />
                <ellipse cx={e.c.x.v} cy={e.c.y.v} rx={e.r.x.v} ry={e.r.y.v} fill={"orange"} fillOpacity={0.3} />
                {
                    points.map(({ x, y }, i) =>
                        <circle key={i} cx={x.v} cy={y.v} r={0.05} fill={"red"} />
                    )
                }
            </Grid>
        </div>
    </div>
}
