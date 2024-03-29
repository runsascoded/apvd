import React, {MouseEvent, useCallback, useMemo, useState} from 'react';
import SvgEllipse from './svg-ellipse';
import Ellipse, {Center, RadiusVector} from "../lib/ellipse";
import {Point} from "./point";
import Grid, {GridState} from "./grid";
import Region, {Props as RegionProps} from "../components/region"
import css from "./svg.module.scss"
import {sqrt} from "../lib/math";

function getTheta(x: number, y: number, t: number) {
    const r = sqrt(x * x + y * y);
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

export type Props = {
    ellipses: Ellipse[]
    idx: number
    onEllipseDrag?: (e: number, d: Center | RadiusVector) => void
    transformBy?: Ellipse
    onCursor: (p: Point, svgIdx: number) => void
    gridState: GridState
    cursor: Point
    points: Point[]
    regions?: RegionProps[]
    hideCursorDot: boolean
}

export type DragAnchor = 'c' | 'f1' | 'f2' | 'vx1' | 'vx2' | 'vy1' | 'vy2'

export default function Svg({ ellipses, idx, onEllipseDrag, transformBy, onCursor, gridState, points, regions, hideCursorDot, cursor, }: Props) {
    const [pointRadius, setPointRadius] = useState(3);
    const [dragEllipse, setDragEllipse] = useState<number | null>(null);
    const [dragAnchor, setDragAnchor] = useState<DragAnchor | null>(null);
    const [lastOffset, setLastOffset] = useState<Point | null>(null);

    function onDragEnd() {
        setDragAnchor(null);
        setDragEllipse(null);
    }
    const {
        center: [ center ],
        scale: [ scale ],
        width: [ width ],
        height: [ height ],
        gridSize: [ gridSize ],
        showGrid: [ showGrid ],
    } = gridState

    const actual = useCallback(
        (x: number, y: number) => ({
            x: x * scale + width / 2,
            y: y * scale + height / 2,
        }),
        [ width, height, scale ]
    )

    const handleMouseMove = useCallback(
        (e: MouseEvent, offset: Point, vOffset: Point) => {
            console.log("handleMouseMove:", offset, vOffset)
            if (onCursor) {
                if (transformBy) {
                    const [x, y] = transformBy.invert(vOffset.x, vOffset.y);
                    onCursor({ x, y }, idx);
                } else
                    onCursor(vOffset, idx);
            }

            // TODO: single drag state object
            if (dragAnchor && lastOffset && dragEllipse !== null && onEllipseDrag) {
                let dx = vOffset.x - lastOffset.x
                let dy = -(vOffset.y - lastOffset.y)
                const ellipse = ellipses[dragEllipse];
                if (dragAnchor === 'c') {
                    // console.log(`onEllipseDrag(${dragEllipse}, { cx: ${ellipse.cx + dx}, cy: ${ellipse.cy - dy} })`)
                    onEllipseDrag(
                        dragEllipse,
                        {
                            cx: ellipse.cx + dx,
                            cy: ellipse.cy - dy
                        }
                    );
                } else {
                    const t = ellipse.theta
                    const cos = Math.cos(t);
                    const sin = Math.sin(t);
                    if (dragAnchor === 'vx1' || dragAnchor === 'vx2') {
                        if (dragAnchor === 'vx2') {
                            dx = -dx;
                            dy = -dy;
                        }
                        const rx = ellipse.rx;
                        const rxx = rx * cos;
                        const rxy = rx * sin;
                        const nxx = rxx + dx;
                        const nxy = rxy - dy;
                        const { theta, r } = getTheta(nxx, nxy, t);
                        onEllipseDrag(dragEllipse, { theta, rx: r });
                    } else if (dragAnchor === 'vy1' || dragAnchor === 'vy2') {
                        if (dragAnchor === 'vy2') {
                            dx = -dx;
                            dy = -dy;
                        }
                        const ry = ellipse.ry;
                        const ryx = -ry * sin;
                        const ryy = ry * cos;
                        let nyx = ryx + dx;
                        const nyy = ryy - dy;

                        const { theta, r } = getTheta(nyy, -nyx, t);
                        onEllipseDrag(dragEllipse, { theta, ry: r });
                    } else if (dragAnchor === 'f1' || dragAnchor === 'f2') {
                        if (dragAnchor === 'f2') {
                            dx = -dx;
                            dy = -dy;
                        }
                        const { rx, ry } = ellipse;
                        const rM = Math.max(rx, ry);
                        const rm = Math.min(rx, ry);
                        const f = sqrt(rM * rM - rm * rm);
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

                        const polar =
                            (rx >= ry)
                                ? { rx: sqrt(ry*ry + r*r), theta, }
                                : { ry: sqrt(rx*rx + r*r), theta, }
                        onEllipseDrag(dragEllipse, polar);
                    }
                }
            }
            setLastOffset(vOffset)
        },
        [ transformBy, onCursor, dragEllipse, onEllipseDrag, dragAnchor, ellipses, idx, lastOffset, setLastOffset ]
    )

    const ellipseDragStart = useCallback(
        (e: MouseEvent, dragAnchor: DragAnchor, dragEllipse: number) => {
            console.log("ellipseDragStart:", dragAnchor, dragEllipse)
            setDragAnchor(dragAnchor);
            setDragEllipse(dragEllipse);
            e.stopPropagation()
        },
        []
    )

    const transformed = useCallback(
        (x: number, y: number) => {
            if (transformBy) {
                const [ tx, ty ] = transformBy.transform([ x, y ]);
                return { x: tx, y: ty };
            } else {
                return { x, y };
            }
        },
        [ transformBy ]
    )

    const svgEllipses = useMemo(
        () => {
            // if (idx > 0)
            //     console.log(`SVG ${idx} computing ellipses ${transformBy}`)
            return ellipses.map((ellipse, k) => {
                const transformedEllipse =
                    transformBy ?
                        ellipse.project(transformBy) :
                        ellipse;

                const dragging = dragEllipse === k
                // if (!dragging && transformBy) {
                //     console.log(`SVG${idx}, ellipse${ellipse.idx}/k${k}:${pp(ellipse.cx, ellipse.cy)} → ${pp(transformBy.cx, transformBy.cy)} = ${pp(transformedEllipse.cx, transformedEllipse.cy)}`)
                // }
                return (
                    <SvgEllipse
                        key={ellipse.name}
                        ellipseIdx={ellipse.idx}
                        dragging={dragging}
                        dragStart={ellipseDragStart}
                        {...transformedEllipse}
                        scale={scale}
                    />
                );
            })
        },
        [ ellipses, transformBy, dragEllipse, ellipseDragStart, scale ]
    )

    let svgPoints = useMemo(
        () =>
            points.map(
                (p, i) => {
                    const t = transformed(p.x, p.y);
                    //console.log("transformed point:", p, t);
                    return <circle
                        key={i}
                        r={pointRadius / scale}
                        className={css.projectedPoint}
                        cx={t.x}
                        cy={t.y}
                    />
                }
            ),
    [ transformed, pointRadius, scale, points, ]
    )

    const transformedCursor = cursor ? transformed(cursor.x, cursor.y) : null;
    const rawCursor = transformedCursor ? actual(transformedCursor.x, transformedCursor.y) : null;

    const [ cursorCircle, cursorVirtualCoords, cursorRawCoords ] =
        (cursor && transformedCursor && rawCursor) ?
            [
                !hideCursorDot &&
                <circle
                    className={css.projectedCursor}
                    r={3 / scale}
                    cx={transformedCursor.x}
                    cy={transformedCursor.y}
                />,
                <text className={css.cursor} x="10" y="20">
                    {
                        [
                            cursor.x.toString().substr(0,4),
                            cursor.y.toString().substr(0,4)
                        ].join(",")
                    }
                </text>,
                <text className={css.cursor} x="10" y="40">
                    {
                        [
                            rawCursor.x.toString().substr(0,4),
                            rawCursor.y.toString().substr(0,4)
                        ].join(",")
                    }
                </text>
            ] :
            [ null, null, null ];

    return <Grid
        className={css.grid}
        handleMouseMove={handleMouseMove}
        // handleMouseUp={}
        // handleDragStart={ellipseDragStart}
        handleMouseUp={onDragEnd}
        state={gridState}
        outerChildren={<>
            {cursorRawCoords}
            {cursorVirtualCoords}
        </>}
    >
        {regions && <g className={css.regions}>{
            regions.map((region, idx) => <Region key={idx} className={css.region} {...region} />)
        }</g>}
        <g className={css.ellipses}>{svgEllipses}</g>
        <g className={css.points}>{svgPoints}</g>
        {cursorCircle}
    </Grid>
}
