import React, {MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";
import { Resizable } from 'react-resizable';
import {Point} from "./point";
import {State} from "../lib/utils";
import css from "./grid.module.scss"
import ReactScrollWheelHandler from "react-scroll-wheel-handler";
import {ceil, floor} from "../lib/math";

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
    resizableBottom?: boolean
    state: GridState
    children: ReactNode
    outerChildren?: ReactNode
    className?: string
}

export type ClientEvent = {
    clientX: number
    clientY: number
}

export type OffsetEvent = {
    offsetX: number
    offsetY: number
}

export default function Grid({ handleMouseMove, handleMouseDown, handleMouseUp, resizableBottom, state, children, outerChildren, className, }: Props) {
    const svg = useRef<SVGSVGElement>(null)
    const {
        center: [ center, setCenter ],
        scale: [ scale, setScale ],
        width: [ width, setWidth ],
        height: [ height, setHeight ],
        gridSize: [ gridSize, setGridSize ],
        showGrid: [ showGrid, setShowGrid ],
    } = state

    const [ resizeStartHeight, setResizeStartHeight ] = useState<null | { height: number, scale: number }>(null)

    const virtualBox = useMemo(
        () => [
            { x: center.x - width / 2 / scale, y: center.y - height / 2 / scale },
            { x: center.x + width / 2 / scale, y: center.y + height / 2 / scale },
        ],
        [ width, height, scale, center ]
    )
    const virtual = useCallback(
        (offset: Point) => ({
            x: (offset.x - width / 2) / scale + center.x,
            y: (height / 2 - offset.y) / scale + center.y,
        }),
        [ center, scale, width, height ]
    )

    const getOffset = useCallback(
        (e: ClientEvent): [ Point, DOMRect | undefined ] => {
            const rect = svg.current?.getBoundingClientRect();
            const { left, top } = rect || { left: 0, top: 0 };
            return [ { x: e.clientX - left, y: e.clientY - top }, rect ]
        },
        [ svg.current ]
    )

    useEffect(
        () => {
            // console.log("svg dims:", svg.current?.clientWidth, svg.current?.clientHeight)
            if (svg.current?.clientWidth) {
                setWidth(svg.current.clientWidth)
            }
            if (svg.current?.clientHeight) {
                setHeight(svg.current.clientHeight)
            }
        },
        [ svg.current?.clientWidth, svg.current?.clientHeight, ]
    )

    const virtualMouseCoords = useCallback(
        (e: ClientEvent) => virtual(getOffset(e)[0]),
        [ getOffset, virtual ]
    )

    const [ dragState, setDragState ] = useState<[Point, Point] | null>(null)
    const onMouseDown = useCallback(
        (e: MouseEvent) => {
            const [offset, rect] = getOffset(e)
            const vOffset = virtual(offset);
            // console.log("Grid.onMouseDown:", offset)
            if (handleMouseDown) {
                handleMouseDown(e, rect)
            }
            setDragState([vOffset, center])
        },
        [ getOffset, handleMouseDown, virtual, center, ]
    )

    const onMouseUp = useCallback(
        () => {
            if (handleMouseUp) {
                handleMouseUp()
            }
            setDragState(null)
        },
        [ handleMouseUp, setDragState ]
    )
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            const [ offset ] = getOffset(e)
            const vOffset = virtual(offset);
            // console.log("onMouseMove", offset, vOffset, "dragStart", dragState)
            if (handleMouseMove) {
                handleMouseMove(e, offset, vOffset)
            }
            if (dragState) {
                const [ dragStart, originalCenter ] = dragState
                const centerDelta = {
                    x: center.x - originalCenter.x,
                    y: center.y - originalCenter.y,
                }
                const dragDelta = {
                    x: vOffset.x - dragStart.x,
                    y: vOffset.y - dragStart.y,
                }
                const delta = {
                    x: dragDelta.x - centerDelta.x,
                    y: dragDelta.y - centerDelta.y,
                }
                // console.log("drag:", offset, vOffset, "dragStart", dragStart, "dragDelta", dragDelta, "centerDelta", centerDelta, "delta", delta)
                const newCenter = { x: originalCenter.x - delta.x, y: originalCenter.y - delta.y }
                setCenter(newCenter)
                // setDragStart(newCenter)
            }
        },
        [ getOffset, handleMouseMove, virtual, scale, dragState, center, ]
    )

    const [ gridLines, xAxis, yAxis, ] = useMemo(
        () => {
            let gridLines = []
            let xAxis = null
            let yAxis = null
            if (showGrid) {
                const [ lo, hi ] = virtualBox
                const startX = floor(lo.x)
                const endX = ceil(hi.x)
                const startY = floor(lo.y)
                const endY = ceil(hi.y)

                const vLines = [];
                for (let x = startX; x <= endX; x += gridSize) {
                    const d = "M" + x + " " + startY + "V" + endY;
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
                gridLines.push(
                    <g key="vertical" id={"grid-vLines"} className={`${css.gridLines || ''} ${css.vertical || ''}`}>{vLines}</g>
                );

                const hLines = [];
                for (let y = startY; y <= endY; y += gridSize) {
                    const d = "M" + startX + " " + y + "H" + endX;
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
            return [ gridLines, xAxis, yAxis, ]
        },
        [ showGrid, scale, virtualBox, ]
    )

    const transforms = useMemo(
        () => {
            let transforms: Transform[] = [
                [ "translate", width / 2, height / 2, ],
                [ "scale", scale, -scale, ],
            ]
            if (center.x || center.y) {
                transforms.push([ "translate", -center.x, -center.y, ])
            }
            return transforms
        },
        [ center, scale, width, height ]
    )

    // console.log("Grid:", width, height, scale, center)
    const svgNode = (
        <svg
            ref={svg}
            viewBox={`0 0 ${width} ${height}`}
            className={`${css.svg} ${className || ''}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
        >
            <g
                className={`${css.projection}`}
                transform={transforms.map(([type, x, y]) => `${type}(${x},${y})`).join(" ")}
            >
                {gridLines}
                <g id={"axes"}>
                    {xAxis}
                    {yAxis}
                </g>
                {children}
            </g>
            {outerChildren}
        </svg>
    )

    const resizableNode =
        resizableBottom ?
            <Resizable
                height={height}
                axis={'y'}
                onResizeStart={e => {
                    console.log("resize start:", height)
                    setResizeStartHeight({ height, scale })
                    e.stopPropagation()
                }}
                onResizeStop={e => {
                    console.log("resize stop:", height)
                    setResizeStartHeight(null)
                    e.stopPropagation()
                }}
                onResize={(e, { node, size, handle,}) => {
                    // console.log("height:", height, size.height)
                    setHeight(size.height)
                    if (resizeStartHeight) {
                        setScale(resizeStartHeight.scale * height / resizeStartHeight.height)
                    }
                    e.stopPropagation()
                }}
                handle={
                    <hr className={css.resizeHandle} />
                }
            >
                <div>{svgNode}</div>
            </Resizable>
            : svgNode

    const scrollWheelNode = (
        <ReactScrollWheelHandler
            timeout={0}
            preventScroll={true}
            upHandler={e => {
                if (!e) {
                    console.warn("Grid.wheelProps.upHandler: no event")
                    return
                }
                const virtualCoords = virtualMouseCoords(e)
                // console.log("Grid.wheelProps.upHandler", virtualCoords)
                const interp = 1 / 1.1
                const newCenter = {
                    x: center.x * interp + virtualCoords.x * (1 - interp),
                    y: center.y * interp + virtualCoords.y * (1 - interp),
                }
                setScale(scale * 1.1)
                setCenter(newCenter)
            }}
            downHandler={e => {
                if (!e) {
                    console.warn("Grid.wheelProps.downHandler: no event")
                    return
                }
                const virtualCoords = virtualMouseCoords(e)
                // console.log("Grid.wheelProps.downHandler", virtualCoords)
                const interp = 1 / 1.1
                const newCenter = {
                    x: center.x / interp - virtualCoords.x * (1 - interp) / interp,
                    y: center.y / interp - virtualCoords.y * (1 - interp) / interp,
                }
                setScale(scale / 1.1)
                setCenter(newCenter)
            }}
        >{
            resizableNode
        }</ReactScrollWheelHandler>
    )

    return scrollWheelNode
}
