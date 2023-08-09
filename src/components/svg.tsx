
import React, {ReactNode, useMemo, useRef, useState, MouseEvent} from 'react';
import SvgEllipse from './svg-ellipse';
import { sq } from '../lib/utils';
import Ellipse from "../lib/ellipse";
import {Point} from "./point";

function getTheta(x: number, y: number, t: number) {
    const r = sq(x * x + y * y);
    let theta = null;
    const pi4s = Math.round(t * 2 / Math.PI);

    if (-1 === pi4s) {
        theta = -Math.acos(x/r)
    } else if (0 === pi4s) {
        theta = Math.asin(y/r);
    } else if (1 === pi4s) {
        theta = Math.acos(x/r);
    } else if (1 < pi4s) {
        theta = Math.PI - Math.asin(y/r);
        if (theta > Math.PI)
            theta -= 2*Math.PI;
    } else if (pi4s < -1) {
        theta = -Math.PI - Math.asin(y/r);
        if (theta < -Math.PI)
            theta += 2*Math.PI;
    } else {
        throw new Error(`getTheta(${x}, ${y}, ${t}`)
    }
    return { theta, r };
}

export type Projection = { x: number, y: number, s: number }

export type Polar = { degrees: number } & ({ rx: number } | { ry: number })

export type Props = {
    ellipses: Ellipse[]
    onEllipseDrag: (e: number, d: { cx: number, cy: number } | Polar) => void
    transformBy: Ellipse
    onCursor: (p: Point) => void
    projection: Projection
    gridSize: number
    cursor: Point
    points: Point[]
    regions: ReactNode[]
    hideCursorDot: boolean
    showGrid: boolean
}

export default function Svg({ ellipses, onEllipseDrag, transformBy, onCursor, projection, gridSize, points, regions, hideCursorDot, cursor, showGrid }: Props) {
    const [dragging, setDragging] = useState(false);
    const [pointRadius, setPointRadius] = useState(3);
    const [dragEllipse, setDragEllipse] = useState<number | null>(null);
    const [dragNode, setDragNode] = useState<string | null>(null);
    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragStartY, setDragStartY] = useState<number | null>(null);
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(400);

    const scale = useMemo(() => (projection && projection.s) || 1, [ projection ])

    const svg = useRef<SVGSVGElement>(null)

    function onMouseUp() {
        if (dragging) {
            setDragging(false);
            setDragEllipse(null);
        }
    }

    function dragStart(e: MouseEvent, k: string, ek: number) {
        const rect = svg.current?.getBoundingClientRect();
        const { left, top } = rect || { left: 0, top: 0 };
        setDragging(true);
        setDragNode(k);
        setDragEllipse(ek);
        setDragStartX(e.clientX - left);
        setDragStartY(e.clientY - top);
    }

    function onMouseMove(e: MouseEvent) {
        const rect = svg.current?.getBoundingClientRect();
        const { left, top } = rect || { left: 0, top: 0 };
        const offsetX = e.clientX - left;
        const offsetY = e.clientY - top;

        const vOffset = virtual(offsetX, offsetY);

        if (onCursor) {
            if (transformBy) {
                const [x, y] = transformBy.invert(vOffset.x, vOffset.y);
                onCursor({ x, y });
            } else
                onCursor(vOffset);
        }

        // TODO: single drag state object
        if (dragging && dragEllipse && dragStartX !== null && dragStartY !== null && onEllipseDrag) {
            let dx = (offsetX - dragStartX) / scale;
            let dy = (offsetY - dragStartY) / scale;
            const ellipse = ellipses[dragEllipse];
            if (dragNode === 'c') {
                onEllipseDrag(
                    dragEllipse,
                    {
                        cx: ellipse.cx + dx,
                        cy: ellipse.cy - dy
                    }
                );
            } else {
                const t = ellipse.degrees * Math.PI / 180;  // TODO: can this be ellipse.theta?
                const cos = Math.cos(t);
                const sin = Math.sin(t);
                if (dragNode === 'vx1' || dragNode === 'vx2') {
                    if (dragNode === 'vx2') {
                        dx = -dx;
                        dy = -dy;
                    }
                    const rx = ellipse.rx;
                    const rxx = rx * cos;
                    const rxy = rx * sin;
                    const nxx = rxx + dx;
                    const nxy = rxy - dy;
                    const { theta, r } = getTheta(nxx, nxy, t);
                    onEllipseDrag(
                        dragEllipse,
                        {
                            degrees: theta * 180 / Math.PI,
                            rx: r
                        }
                    );
                } else if (dragNode === 'vy1' || dragNode === 'vy2') {
                    if (dragNode === 'vy2') {
                        dx = -dx;
                        dy = -dy;
                    }
                    const ry = ellipse.ry;
                    const ryx = -ry * sin;
                    const ryy = ry * cos;
                    let nyx = ryx + dx;
                    const nyy = ryy - dy;

                    const { theta, r } = getTheta(nyy, -nyx, t);
                    onEllipseDrag(
                        dragEllipse,
                        {
                            degrees: theta * 180 / Math.PI,
                            ry: r
                        }
                    );
                } else if (dragNode === 'f1' || dragNode === 'f2') {
                    if (dragNode === 'f2') {
                        dx = -dx;
                        dy = -dy;
                    }
                    const { rx, ry } = ellipse;
                    const rM = Math.max(rx, ry);
                    const rm = Math.min(rx, ry);
                    const f = sq(rM * rM - rm * rm);
                    const fx = f * (rx >= ry ? cos : -sin);
                    const fy = f * (rx >= ry ? sin : cos);
                    const nfx = fx + dx;
                    const nfy = fy - dy;
                    const { theta, r } =
                        getTheta(
                            rx >= ry ? nfx : nfy,
                            rx >= ry ? nfy : -nfx,
                            t
                        );

                    const degrees = theta * 180 / Math.PI;
                    const polar =
                        (rx >= ry)
                            ? { rx: sq(ry*ry + r*r), degrees, }
                            : { ry: sq(rx*rx + r*r), degrees, }
                    onEllipseDrag(dragEllipse, polar);
                }
            }
            setDragStartX(offsetX);
            setDragStartY(offsetY);
        }
    }

    function componentDidMount() {
        setWidth(300);
        setHeight(400);
    }

    function transformed(x: number, y: number) {
        if (transformBy) {
            const [ tx, ty ] = transformBy.transform([ x, y ]);
            return { x: tx, y: ty };
        } else {
            return { x, y };
        }
    }

    function virtual(x: number, y: number) {
        return {
            x: (x - width / 2) / scale,
            y: (y - height / 2) / -scale
        };
    }

    function actual(x: number, y: number) {
        return {
            x: x * scale + width / 2,
            y: y * scale + height / 2,
        }
    }


    const transforms = [];
    // let { projection, ellipses, transformBy, cursor, showGrid, gridSize, points, regions, hideCursorDot } = this.props;

    if (projection) {
        if (projection.x !== undefined || projection.y !== undefined) {
            transforms.push([
                "translate",
                (projection.x + width/2) || 0,
                (projection.y + height/2) || 0
            ]);
        }
        if (projection.s) {
            transforms.push([ "scale", projection.s, -projection.s ]);
        }
    }

    const s = scale;

    gridSize = gridSize || (Math.min(width, height) / 11 / s);

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

    const svgEllipses = ellipses.map((ellipse, k) => {
        //console.log("projecting:", ellipse, "into", transformBy);
        const transformedEllipse =
            transformBy ?
                ellipse.project(transformBy) :
                ellipse;

        return (
            <SvgEllipse
                key={k}
                k={k}
                dragging={dragEllipse === k}
                dragStart={dragStart}
                {...transformedEllipse}
                scale={s}
            />
        );
    });

    let svgPoints =
        points.map(
            (p, i) => {
                const t = transformed(p.x, p.y);
                //console.log("transformed point:", p, t);
                return <circle
                    key={i}
                    r={pointRadius / s}
                    className="projected-point"
                    cx={t.x}
                    cy={t.y}
                />
            }
        );

    const transformedCursor = cursor ? transformed(cursor.x, cursor.y) : null;
    const rawCursor = transformedCursor ? actual(transformedCursor.x, transformedCursor.y) : null;

    const [ cursorCircle, cursorVirtualCoords, cursorRawCoords ] =
        (cursor && transformedCursor && rawCursor) ?
            [
                !hideCursorDot &&
                    <circle
                        className="projected-cursor"
                        r={3 / s}
                        cx={transformedCursor.x}
                        cy={transformedCursor.y}
                    />,
                <text className="cursor" x="10" y="20">
                    {
                        [
                            cursor.x.toString().substr(0,4),
                            cursor.y.toString().substr(0,4)
                        ].join(",")
                    }
                </text>,
                <text className="cursor" x="10" y="40">
                    {
                        [
                            rawCursor.x.toString().substr(0,4),
                            rawCursor.y.toString().substr(0,4)
                        ].join(",")
                    }
                </text>
            ] :
            [
                null,
                null,
                null
            ];

    return <svg
        ref={svg}
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
            <g className="regions">{regions}</g>
            <g className="ellipses">{svgEllipses}</g>
            <g className="points">{svgPoints}</g>
            {cursorCircle}
        </g>
        {cursorRawCoords}
        {cursorVirtualCoords}
    </svg>;
}
