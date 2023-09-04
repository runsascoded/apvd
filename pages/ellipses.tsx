import Grid, {GridState} from "../src/components/grid";
import React from "react";
import css from "./circles.module.scss"

export default function Page() {
    const gridState = GridState({
        center: { x: 0.5, y: 1 },
        scale: 100,
        width: 600,
        height: 600,
        showGrid: true,
    })
    return (
        <div className={css.body}>
            <div className={`${css.row} ${css.content}`}>
                <Grid className={css.svg} state={gridState}>
                    <circle cx={0} cy={0} r={1} fill={"green"} fillOpacity={0.3} />
                    <ellipse cx={1} cy={1} rx={2} ry={3} fill={"orange"} fillOpacity={0.3} />
                </Grid>
            </div>
        </div>
    )
}
