import React, {MouseEvent, ReactNode, useCallback, useMemo, useRef, useState} from "react";
import {Point} from "./point";
import {Projection} from "./svg";

export type Transform = [ string, number, number ]

export type Props = {
    handleMouseMove?: (e: MouseEvent, offset: Point, vOffset: Point) => void
    handleMouseDown?: (e: MouseEvent, rect?: DOMRect) => void
    handleMouseUp?: () => void
    projection: Projection
    width: number
    height: number
    gridSize: number
    showGrid?: boolean
    children: ReactNode
    outerChildren?: ReactNode
    className?: string
}

export default function Grid({ handleMouseMove, handleMouseDown, handleMouseUp, projection, width, height, gridSize, showGrid, children, outerChildren, className, }: Props) {
    const svg = useRef<SVGSVGElement>(null)
    const scale = projection.s

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
            if (handleMouseMove) {
                handleMouseMove(e, offset, vOffset)
            }
        },
        [ getOffset, handleMouseMove, virtual, scale ]
    )

    gridSize = gridSize || (Math.min(width, height) / 11 / scale);

    const gridLines = [];
    let xAxis = null
    let yAxis = null
    if (showGrid !== false) {
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
            const vLine = <path
                key={"v-"+x}
                className={"grid-line" + (x === 0 ? " axis" : "")}
                strokeWidth={gridSize / 20}
                d={d}
            />
            if (x == 0) {
                yAxis = vLine
            } else {
                vLines.push(vLine);
            }
        }
        gridLines.push(<g key="vertical" className="grid-lines vertical">{vLines}</g>);

        const startY = by - (by % gridSize);

        const hLines = [];
        for (let y = startY; y <= ty; y += gridSize) {
            const d = "M" + lx + " " + y + "H" + rx;
            const hLine = <path
                key={"h-"+y}
                className={"grid-line" + (y === 0 ? " axis" : "")}
                strokeWidth={gridSize / 20}
                d={d}
            />
            if (y == 0) {
                xAxis = hLine;
            } else {
                hLines.push(hLine);
            }
        }
        gridLines.push(
            <g key="horizontal" className="grid-lines horizontal">{hLines}</g>
        );
    }

    const transforms: Transform[] = useMemo(
        () => {
            const transforms: Transform[] = [];
            if (projection) {
                if (projection.x !== undefined || projection.y !== undefined) {
                    transforms.push([
                        "translate",
                        (projection.x + width / 2) || 0,
                        (projection.y + height / 2) || 0
                    ]);
                }
                if (projection.s) {
                    transforms.push(["scale", projection.s, -projection.s]);
                }
            }
            return transforms
        },
        [projection]
    )

    return <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        className={className || ''}
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
            {xAxis}
            {yAxis}
            {children}
        </g>
        {outerChildren}
    </svg>;
}
