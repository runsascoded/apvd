import Grid, {GridState} from "../src/components/grid";
import React, {useEffect} from "react";
import css from "./index.module.scss"
import {Dual, R2, XYRR, xyrr_unit} from "apvd";
import Apvd from "../src/components/apvd";
import {colors, Ellipses4, SymmetricCircleDiamond} from "./index";

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
    // const e: XYRR<Dual> = {
    //     idx: 0,
    //     c: { x: { v: 1, d: [1, 0, 0, 0] },
    //          y: { v: 1, d: [0, 1, 0, 0] }, },
    //     r: { x: { v: 2, d: [0, 0, 1, 0] },
    //          y: { v: 3, d: [0, 0, 0, 1] }, },
    // }
    // const points = xyrr_unit(e) as R2<Dual>[]
    // console.log("points:", points)

    // Best step: 7780, error: 6.06 (0.298%)
    const VariantCallersDiamond = [
        { idx: 0, c: { x: -0.4553182219709826, y: 0.17884505200154693 }, r: { x: 1.0951326124117782, y: 0.9071057318481802 } },
        { idx: 1, c: { x: 1.333654097086801, y: -0.00412421461340562 }, r: { x: 1.568595165932032, y: 0.6719185326233371 } },
        { idx: 2, c: { x: 0.5223912892170324, y: -1.4112401664980556 }, r: { x: 0.12028965584623531, y: 2.745273808704677 } },
        { idx: 3, c: { x: 0.5992728356671563, y: 1.2365193291099115 }, r: { x: 0.35909734519009495, y: 1.6020928575258693 } },
    ]

    const VariantCallersEllipses4 = [

    ]

    // Best step: 8214, error: 10.3 (6.35%)
    const FizzBazzBuzzQuxEllipses4 = [
        { idx: 0, c: { x: 0.4587885422532695, y: 1.943878304424149 }, r: { x: 1.5977393619378966, y: 2.7197101173390705 } },
        { idx: 1, c: { x: 1.6283329914083586, y: 2.5074873018950097 }, r: { x: 0.8783026610285597, y: 3.361783508511935 } },
        { idx: 2, c: { x: 1.4531674185241255, y: -0.01003771093215624 }, r: { x: 1.8718372135712753, y: 0.94889525545798 } },
        { idx: 3, c: { x: 1.9318470028138186, y: 1.0308080596125855 }, r: { x: 2.956394319861579, y: 0.4246051797120042 } },
    ]

    // Best step: 9645, error: 6.76 (4.17%)
    const FizzBazzBuzzQuxDiamond = [
        { idx: 0, c: { x: 1.2498122493889587, y: 0.2073853226837169 }, r: { x: 3.771307394777941, y: 1.3799315882467749 } },
        { idx: 1, c: { x: -0.7678453548155754, y: -0.4133892571327881 }, r: { x: 1.3158070016890357, y: 2.6742697692509942 } },
        { idx: 2, c: { x: 0.7257840964330529, y: 1.436643480003305 }, r: { x: 2.7723928499549393, y: 0.7564765192616367 } },
        { idx: 3, c: { x: 0.46653151879072174, y: -0.7965470456622337 }, r: { x: 0.48660248517226884, y: 3.0712138925158463 } },
    ]
    const FizzBazzBuzzQuxBug = [
        { idx: 0, c: { x: -2.0547374714862916, y: 0.7979432881804286 }, r: { x: 15.303664487498873, y: 17.53077114567813 } },
        { idx: 1, c: { x: -11.526407092112622, y: 3.0882189920409058 }, r: { x: 22.75383340199038, y: 5.964648612528639 } },
        { idx: 2, c: { x: 10.550418544451459, y: 0.029458342547552023 }, r: { x: 6.102407875525676, y: 11.431493472697646 } },
        { idx: 3, c: { x: 4.271631577807546, y: -5.4473446956862155 }, r: { x: 2.652054463066812, y: 10.753963707585315 } },
    ]

    const CentroidRepel = [
        { c: { x:  0. , y: 0. }, r: { x: 1., y: 3. } },
        { c: { x:  0.5, y: 1. }, r: { x: 1., y: 1. } },
        { c: { x: -0.5, y: 1. }, r: { x: 1., y: 1. } },
    ]

    const Components = [
        { idx: 0, c: { x: 0. , y: 0. }, r: { x: 1, y: 1, } },
        { idx: 1, c: { x: 1. , y: 0. }, r: { x: 1, y: 1, } },
        { idx: 2, c: { x: 0.5, y: 0. }, r: { x: 3, y: 3, } },
        { idx: 3, c: { x: 0. , y: 3. }, r: { x: 1, y: 1, } },
    ]

    return <div className={css.body}>
        <div className={`${css.row} ${css.content}`}>
            <Grid className={css.grid} state={gridState}>
                {
                    (CentroidRepel as XYRR<number>[]).map(({ c, r }, shapeIdx) =>
                        <ellipse
                            key={shapeIdx}
                            cx={c.x}
                            cy={c.y}
                            rx={r.x}
                            ry={r.y}
                            fill={colors[shapeIdx]}
                            fillOpacity={0.3}
                        />
                    )
                }
                {/*<circle cx={0} cy={0} r={1} fill={"green"} fillOpacity={0.3} />*/}
                {/*<ellipse cx={e.c.x.v} cy={e.c.y.v} rx={e.r.x.v} ry={e.r.y.v} fill={"orange"} fillOpacity={0.3} />*/}
                {/*{*/}
                {/*    points.map(({ x, y }, i) =>*/}
                {/*        <circle key={i} cx={x.v} cy={y.v} r={0.05} fill={"red"} />*/}
                {/*    )*/}
                {/*}*/}
                <clipPath id="myClip" onMouseMove={() => console.log("clipPath")}>
                    <circle cx="3" cy="3" r="1" fill={"black"} onMouseMove={() => console.log("circle")} />
                </clipPath>
                <g fill={"blue"}>
                    <path
                        id="heart"
                        d="M1,3 A2,2,0,0,1,5,3 A2,2,0,0,1,9,3 Q9,6,5,9 Q1,6,1,3 Z"
                        onMouseMove={() => console.log("heart")}
                        // fill={`blue`}
                    />
                    <use clipPath="url(#myClip)" href="#heart" fill="red" onMouseMove={() => console.log("use")}>
                        <rect x="0" y="0" width="1" height="1" fill="green" />
                    </use>
                </g>
            </Grid>
        </div>
    </div>
}
