import Grid, {GridState} from "../src/components/grid";
import React, {useState} from "react";
import css from "./index.module.scss"
import {XYRR} from "apvd";
import Apvd from "../src/components/apvd";
import {colors} from "./index";

export default function Page() {
    return <Apvd>{() => <Body />}</Apvd>
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

    const FBBQBest = [
        { c: { x: -0.6623613605476808, y: 1.6150844458600233 }, r: { x: 1.132853438009814, y: 2.6566835555894164 }, t: 0.7251271584093641 },
        { c: { x: -0.2640150183541898, y: 2.5417032698701134 }, r: { x: 0.8297470370865335, y: 2.4669109031940395 }, t: 0.8520674202911124 },
        { c: { x: 0.7471537112059237, y: 1.6124576905184242 }, r: { x: 2.412592185979418, y: 0.4835135212889133 }, t: 0.8618604320003261 },
        { c: { x: 0.1792226676959515, y: 1.969523476461327 }, r: { x: 2.5773248147991814, y: 0.3357234360265198 }, t: 0.7512355592905697 },
    ]

    // Best step: 8030, error: 15.0 (0.738%)
    const VariantCallers4EllipsesBest = [
        { c: { x: -1.236744288969088, y: 1.2328503850336952 }, r: { x: 0.979368819861829, y: 1.5690046580280144 }, t: 1.446982887399892 },
        { c: { x: -0.6014081054213224, y: 2.682721341891131 }, r: { x: 0.5559924912152966, y: 2.9290547006213763 }, t: 0.4242493481078193 },
        { c: { x: 0.8515061682429365, y: 2.3931442778395438 }, r: { x: 2.0045088801616893, y: 0.2525419022048926 }, t: 1.0557763721102444 },
        { c: { x: 0.9866462261474814, y: 1.4300528779454844 }, r: { x: 1.6208459296629025, y: 0.5501747792910308 }, t: 0.6624767067029259 },
    ]

    // Best step: 24237, error: 10.6 (0.522%)
    const VariantCallers4Diamond = [
        { c: { x: -1.0254736540060956, y: -0.03519727937753458 }, r: { x: 1.3604807803891832, y: 0.6232229377320119 }, t: 0.18849015379220233 },
        { c: { x: 0.01859949328013456, y: 0.8699007141071402 }, r: { x: 0.9378952149731852, y: 0.9018678185073424 }, t: -0.11687589873717798 },
        { c: { x: 0.7688925121791963, y: -0.09953349854835329 }, r: { x: 0.909877593325079, y: 0.3088545758179174 }, t: -0.3489426408710326 },
        { c: { x: 0.23798164854677314, y: -0.7351699361812449 }, r: { x: 0.2744357182236795, y: 1.789111719531891 }, t: 0.077181048275369 },
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
    const fillOpacity = 0.3
    const [ regionOver, setRegionOver ] = useState<"heart" | "circle" | null>(null)
    console.log("regionOver:", regionOver)
    const circle = (props: Partial<React.SVGProps<SVGCircleElement>>) => <circle cx={3} cy={3} r={1} {...props} />
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
                            fillOpacity={fillOpacity}
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
                <defs>
                    <clipPath id="myClip" onMouseMove={() => console.log("clipPath")}>
                        {circle({
                            // fill: "black",
                            onMouseMove: () => console.log("clipPath circle")
                        })}
                        {/*<circle cx={3} cy={3} r={1} fill={"black"} onMouseMove={() => console.log("circle")} />*/}
                    </clipPath>
                </defs>
                <g
                    fill={"blue"}
                    // onMouseOver={() => console.log("g over")}
                    // onMouseMove={() => console.log("g move")}
                    // onMouseOut={() => console.log("g out")}
                >
                    <path
                        id="heart"
                        d="M1,3 A2,2,0,0,1,5,3 A2,2,0,0,1,9,3 Q9,6,5,9 Q1,6,1,3 Z"
                        onMouseOver={() => { console.log("heart over"); setRegionOver("heart") }}
                        // onMouseMove={() => console.log("heart move")}
                        onMouseOut={() => { console.log("heart out"); setRegionOver(null) }}
                        fillOpacity={regionOver === "heart" ? 1 : fillOpacity}
                        fill={`black`}
                        clipPath="url(#myClip)"
                    />
                    {/*<use*/}
                    {/*    clipPath="url(#myClip)"*/}
                    {/*    href="#heart"*/}
                    {/*    // fill="red"*/}
                    {/*    // fillOpacity={regionOver === "circle" ? 1 : fillOpacity}*/}
                    {/*    onMouseOver={() => { console.log("use over"); setRegionOver("circle") }}*/}
                    {/*    // onMouseMove={() => console.log("use move")}*/}
                    {/*    onMouseOut={() => console.log("use out")}*/}
                    {/*>*/}
                    {/*    /!*<rect x={0} y={0} width={1} height={1} fill={"green"} fillOpacity={fillOpacity} />*!/*/}
                    {/*</use>*/}
                </g>
                {circle({
                    fill: "green",
                    fillOpacity: regionOver === "circle" ? 1 : fillOpacity,
                    onMouseOver: () => console.log("circle over"),
                    // onMouseMove: () => console.log("circle move"),
                    onMouseOut: () => console.log("circle out"),
                })}
            </Grid>
        </div>
    </div>
}
