import React, {MouseEvent, ReactNode, useCallback, useMemo, useRef, useState} from "react";
import {Point} from "./point";

export type Transform = [ string, number, number ]

type MouseCb = (e: MouseEvent) => void
export type Props = {
    handleMouseMove: (e: MouseEvent, offset: Point, vOffset: Point) => void
    handleMouseDown?: (e: MouseEvent, rect?: DOMRect) => void
    handleMouseUp?: () => void
    transforms: Transform[]
    scale: number
    gridSize: number
    width: number
    height: number
    showGrid?: boolean
    children: ReactNode
    outerChildren?: ReactNode
}

export default function Grid({ handleMouseMove, handleMouseDown, handleMouseUp, transforms, width, height, scale, gridSize, showGrid, children, outerChildren }: Props) {
    const svg = useRef<SVGSVGElement>(null)
    // const scale = useMemo(() => (projection && projection.s) || 1, [ projection ])


    const virtual = useCallback(
        (x: number, y: number) => ({
            x: (x - width / 2) / scale,
            y: (y - height / 2) / -scale
        }),
        [ width, height, scale ]
    )

    const getOffset = useCallback(
        (e: MouseEvent): [ Point, DOMRect | undefined ] => {
            const rect = svg.current?.getBoundingClientRect();
            const { left, top } = rect || { left: 0, top: 0 };
            return [ { x: e.clientX - left, y: e.clientY - top }, rect ]
        },
        [ svg.current ]
    )

    const onMouseDown = useCallback(
        (e: MouseEvent) => {
            const [offset, rect] = getOffset(e)
            console.log("Grid.onMouseDown:", offset)
            if (handleMouseDown) {
                handleMouseDown(e, rect)
            }
        },
        [ getOffset, handleMouseDown ]
    )

    const onMouseUp = useCallback(
        (e: MouseEvent) => {
            if (handleMouseUp) {
                handleMouseUp()
            }
        },
        [ handleMouseUp ]
    )
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            const [ offset, rect ] = getOffset(e)
            const vOffset = virtual(offset.x, offset.y);
            // console.log("onMouseMove", offset, vOffset, dragOffset)
            handleMouseMove(e, offset, vOffset)
        },
        [ getOffset, handleMouseMove, virtual, scale ]
    )

    gridSize = gridSize || (Math.min(width, height) / 11 / scale);

    const gridLines = [];
    if (showGrid !== undefined) {
        const tl = virtual(0, 0);
        const lx = tl.x - gridSize;
        const ty = tl.y + gridSize;

        const br = virtual(width, height);
        const rx = br.x + gridSize;
        const by = br.y - gridSize;

        const startX = lx - (lx % gridSize);

        const vLines = [];
        for (let x = startX; x <= rx; x += gridSize) {
            const d = "M" + x + " " + ty + "V" + by;
            vLines.push(
                <path
                    key={"v-"+x}
                    className={"grid-line" + (x === 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
                />
            );
        }
        gridLines.push(<g key="vertical" className="grid-lines vertical">{vLines}</g>);

        const startY = by - (by % gridSize);

        const hLines = [];
        for (let y = startY; y <= ty; y += gridSize) {
            const d = "M" + lx + " " + y + "H" + rx;
            hLines.push(
                <path
                    key={"h-"+y}
                    className={"grid-line" + (y === 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
                />
            );
        }
        gridLines.push(
            <g key="horizontal" className="grid-lines horizontal">{hLines}</g>
        );
    }

    return <svg
        ref={svg}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
    >
        <g
            className="projection"
            transform={
                transforms.length
                    ? transforms.map((t) => { return t[0] + "(" + t.slice(1).join(",") + ")"; }).join(" ")
                    : undefined
            }
        >
            {gridLines}
            {children}
        </g>
        {outerChildren}
    </svg>;
}
