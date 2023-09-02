import React, {MouseEvent, useMemo, useState} from 'react';
import { sqrt } from '../lib/math';
import Point from './point';
import {DragAnchor} from "./svg";
import {XY} from "../lib/ellipse";

export type Props = {
    cx: number
    cy: number
    rx: number
    ry: number
    degrees: number
    color: string
    dragStart: (e: MouseEvent, dragAnchor: DragAnchor, ellipseIdx: number) => void
    dragging: boolean
    ellipseIdx: number
    scale: number
}

type Node = { k: DragAnchor, xy: XY, color: string }

export default function SvgEllipse({ cx, cy, rx, ry, degrees, color, scale, ellipseIdx, ...props }: Props) {
    const [ mouseEntered, setMouseEntered ] = useState(false)

    function onMouseEnter() {
        // console.log(`mouse enter: ${ellipseIdx}`)
        setMouseEntered(true)
    }

    function onMouseLeave() {
        // console.log(`mouse leave: ${ellipseIdx}`)
        setMouseEntered(false)
    }

    function dragStart(e: MouseEvent, dragAnchor: DragAnchor) {
        props.dragStart(e, dragAnchor, ellipseIdx)
    }

    const dragAnchors: Node[] = useMemo(
        () => {
            const vx1 = [rx, 0]
            const vx2 = [-rx, 0]

            const vy1 = [0, ry]
            const vy2 = [0, -ry]

            const c = [0, 0]

            const rM = Math.max(rx, ry)
            const rm = Math.min(rx, ry)
            const rc = sqrt(rM * rM - rm * rm)

            const f1 = rx >= ry ? [rc, 0] : [0, rc]
            const f2 = rx >= ry ? [-rc, 0] : [0, -rc]

            return ([
                { k:  "f1", xy:  f1, color: "lightgrey", },
                { k:  "f2", xy:  f2, color: "lightgrey", },
                { k: "vx1", xy: vx1, color:     "black", },
                { k: "vx2", xy: vx2, color:     "black", },
                { k: "vy1", xy: vy1, color:      "grey", },
                { k: "vy2", xy: vy2, color:      "grey", },
                { k:   "c", xy:   c, color:     "black", },
            ] as Node[])
        },
        [ rx, ry ]
    )

    const points = useMemo(
        () =>
            (mouseEntered || props.dragging) &&
            dragAnchors.map(({ k, xy, color }) =>
                    <Point
                        key={k}
                        dragAnchor={k}
                        xy={xy}
                        dragStart={dragStart}
                        scale={scale}
                        color={color}
                    />
            ),
        [ mouseEntered, props.dragging, dragStart, scale, dragAnchors ]
    )

    return <g
        transform={"translate(" + cx + "," + cy + ") rotate(" + degrees + ")"}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={e => { dragStart(e, 'c') }}
    >
        <ellipse rx={rx} ry={ry} style={{ fill: color }} />
        {points}
    </g>;
}
