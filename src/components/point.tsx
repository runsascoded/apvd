
import React, { MouseEvent } from 'react';

export type Point = { x: number, y: number }

export type Marker = {
    dragStart: (e: MouseEvent, k: string) => void
    color: string
    cs  : number[]
    k   : string
    scale: number
}

export default function Point({ dragStart, color, cs, k, scale }: Marker) {
    function onMouseDown(e: MouseEvent) {
        dragStart(e, k);
        e.stopPropagation();
    }
    return <circle
        r={5 / scale}
        cx={cs[0]}
        cy={cs[1]}
        onMouseDown={onMouseDown}
        style={{ fill: color || 'black' }}
    />;
}
