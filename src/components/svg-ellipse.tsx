
import React, {MouseEvent, useMemo, useState} from 'react';
import { sqrt } from '../lib/utils';
import Point from './point';

export type Props = {
    cx: number
    cy: number
    rx: number
    ry: number
    degrees: number
    color: string
    dragStart: (e: MouseEvent, node: string, ellipseIdx: number) => void
    dragging: boolean
    ellipseIdx: number
    scale: number
}

export default function SvgEllipse({ cx, cy, rx, ry, degrees, color, scale, ellipseIdx, ...props }: Props) {
    const [ mouseEntered, setMouseEntered ] = useState(false)

    function onMouseEnter() {
        console.log(`mouse enter: ${ellipseIdx}`)
        setMouseEntered(true)
    }

    function onMouseLeave() {
        console.log(`mouse leave: ${ellipseIdx}`)
        setMouseEntered(false)
    }

    function dragStart(e: MouseEvent, node: string) {
        props.dragStart(e, node, ellipseIdx)
    }

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

    const points = useMemo(
        () =>
            (mouseEntered || props.dragging) &&
            [
                {k: "f1", cs: f1, color: "lightgrey"},
                {k: "f2", cs: f2, color: "lightgrey"},
                {k: "vx1", cs: vx1, color: "black"},
                {k: "vx2", cs: vx2, color: "black"},
                {k: "vy1", cs: vy1, color: "grey"},
                {k: "vy2", cs: vy2, color: "grey"},
                {k: "c", cs: c, color: "black"},
            ].map(({k, cs, color}) =>
                    <Point
                        key={k}
                        k={k}
                        cs={cs}
                        dragStart={dragStart}
                        scale={scale}
                        color={color}
                    />
            ),
        [ mouseEntered, props.dragging, dragStart, scale ]
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
