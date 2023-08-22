
import React, { MouseEvent } from 'react';
import {DragAnchor} from "./svg";
import {XY} from "../lib/ellipse";

export type Point = { x: number, y: number }

export type Marker = {
    dragStart: (e: MouseEvent, dragAnchor: DragAnchor) => void
    color: string
    xy: XY
    dragAnchor: DragAnchor
    scale: number
}

export default function Point({ dragStart, color, xy, dragAnchor, scale }: Marker) {
    function onMouseDown(e: MouseEvent) {
        dragStart(e, dragAnchor);
        e.stopPropagation();
    }
    return <circle
        r={5 / scale}
        cx={xy[0]}
        cy={xy[1]}
        onMouseDown={onMouseDown}
        style={{ fill: color || 'black' }}
    />;
}
