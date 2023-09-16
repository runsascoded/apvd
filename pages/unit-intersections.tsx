import Grid, {GridState} from "../src/components/grid";
import React, {useEffect} from "react";
import css from "./circles.module.scss"
import {Dual, R2, XYRR, xyrr_unit} from "apvd";
import Apvd from "../src/components/apvd";
import {colors, Ellipses4} from "./index";

export default function Page() {
    return <Apvd logLevel={"debug"}>{() => <Body />}</Apvd>
}

export function Body() {
    const gridState = GridState({
        center: { x: 1, y: 1 },
        scale: 100,
        width: 600,
        height: 600,
        showGrid: true,
    })
    const e: XYRR<number> = {
        idx: 0,
        c: { x: -0.6708203932499369, y: 0.34164078649987384, },
        r: { x: 0.5, y: 2, },
    }
    // const points = xyrr_unit(e) as R2<Dual>[]
    // console.log("points:", points)

    return <div className={css.body}>
        <div className={`${css.row} ${css.content}`}>
            <Grid className={css.svg} state={gridState}>
                <circle cx={0} cy={0} r={1} fill={"green"} fillOpacity={0.3} />
                <ellipse cx={e.c.x} cy={e.c.y} rx={e.r.x} ry={e.r.y} fill={"orange"} fillOpacity={0.3} />
                {/*{*/}
                {/*    points.map(({ x, y }, i) =>*/}
                {/*        <circle key={i} cx={x.v} cy={y.v} r={0.05} fill={"red"} />*/}
                {/*    )*/}
                {/*}*/}
            </Grid>
        </div>
    </div>
}