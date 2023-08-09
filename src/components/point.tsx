
import React from 'react';

export type Point = { x: number, y: number }

export type Marker = {
    dragStart: (e: MouseEvent, k: number) => void
    color: string
    cs  : number[]
    k   : number
    scale: number
}

export default function Point({ dragStart, color, cs, k, scale }: Marker) {
    function onMouseDown(e) {
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
