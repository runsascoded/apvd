import React, {MouseEvent, ReactNode, useCallback, useMemo, useRef, useState} from "react";
import {Point} from "./point";
import {State} from "../lib/utils";
import css from "./grid.module.scss"

export type GridStateProps = {
    center?: Point
    scale: number
    width: number
    height: number
    gridSize?: number
    showGrid?: boolean
}
export type GridState = {
    center: State<Point>
    scale: State<number>
    width: State<number>
    height: State<number>
    gridSize: State<number>
    showGrid: State<boolean>
}
export function GridState(init: GridStateProps): GridState {
    const center = useState(init.center || { x: 0, y: 0 })
    const scale = useState(init.scale)
    const width = useState(init.width);
    const height = useState(init.height);
    const gridSize = useState(init.gridSize || 1)
    const showGrid = useState(init.showGrid || false)
    return {
        center,
        scale,
        width,
        height,
        gridSize,
        showGrid,
    }
}

export type Transform = [ string, number, number ]

export type Props = {
    handleMouseMove?: (e: MouseEvent, offset: Point, vOffset: Point) => void
    handleMouseDown?: (e: MouseEvent, rect?: DOMRect) => void
    handleMouseUp?: () => void
    state: GridState
    children: ReactNode
    outerChildren?: ReactNode
    className?: string
}

export default function Grid({ handleMouseMove, handleMouseDown, handleMouseUp, state, children, outerChildren, className, }: Props) {
    const svg = useRef<SVGSVGElement>(null)
    const {
        center: [ center, setCenter ],
        scale: [ scale, setScale ],
        width: [ width, setWidth ],
        height: [ height, setHeight ],
        gridSize: [ gridSize, setGridSize ],
        showGrid: [ showGrid, setShowGrid ],
    } = state
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
        () => {
            if (handleMouseUp) {
                handleMouseUp()
            }
        },
        [ handleMouseUp ]
    )
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            const [ offset ] = getOffset(e)
            const vOffset = virtual(offset.x, offset.y);
            // console.log("onMouseMove", offset, vOffset, dragOffset)
            if (handleMouseMove) {
                handleMouseMove(e, offset, vOffset)
            }
        },
        [ getOffset, handleMouseMove, virtual, scale ]
    )

    const gridLines = [];
    let xAxis = null
    let yAxis = null
    if (showGrid) {
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
            const key = `v-${x}`
            const vLine = <path
                key={key}
                id={key}
                className={(css.gridLine || '') + (x === 0 ? ` ${css.axis || ''}` : "")}
                strokeWidth={gridSize / 20}
                d={d}
            />
            if (x == 0) {
                yAxis = vLine
            } else {
                vLines.push(vLine);
            }
        }
        gridLines.push(<g key="vertical" id={"grid-vLines"} className={`${css.gridLines || ''} ${css.vertical || ''}`}>{vLines}</g>);

        const startY = by - (by % gridSize);

        const hLines = [];
        for (let y = startY; y <= ty; y += gridSize) {
            const d = "M" + lx + " " + y + "H" + rx;
            const key = `h-${y}`
            const hLine = <path
                key={key}
                id={key}
                className={(css.gridLine || '') + (y === 0 ? ` ${css.axis || ''}` : "")}
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
            <g key="horizontal" id={"grid-hLines"} className={`${css.gridLines || ''} ${css.horizontal || ''}`}>{hLines}</g>
        );
    }

    const transforms = useMemo(
        () => {
            let transforms: Transform[] = [
                [ "translate", width / 2, height / 2, ],
                [ "scale", scale, -scale, ],
            ];
            if (center.x || center.y) {
                transforms.push([ "translate", -center.x, -center.y, ]);
            }
            return transforms
        },
        [ center, scale, width, height ]
    )

    return <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        className={`${css.svg} ${className || ''}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
    >
        <g
            className={`${css.projection}`}
            transform={transforms.map(([ type, x, y ]) => `${type}(${x},${y})`).join(" ")}
        >
            {gridLines}
            <g id={"axes"}>
                {xAxis}
                {yAxis}
            </g>
            {children}
        </g>
        {outerChildren}
    </svg>;
}
