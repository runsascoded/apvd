import {getRadii, mapShape, S, Shape} from "../../lib/shape";
import React, {ReactNode} from "react";
import {Vars} from "../../lib/vars";
import css from "./shapes.module.scss"
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import dynamic from "next/dynamic";
import {sqrt} from "../../lib/math";
const StaticMathField = dynamic(() => import("react-mathquill").then(m => { m.addStyles(); return m.StaticMathField }), { ssr: false })

export type Props = {
    sets: S[]
    setShape: (idx: number, shape: Shape<number>) => void
    vars: Vars
    precision?: number
}

export function VarCell({ skipped, className, children }: { skipped: boolean, className?: string, children: ReactNode }) {
    className = (className || css.varCell) + ` ${skipped ? css.skipped : ''}`
    return (
        skipped
            ? <OverlayTrigger overlay={<Tooltip>Fixed/disabled</Tooltip>}>
                <td className={className}>
                    <span>{children}</span>
                </td>
            </OverlayTrigger>
            : <td className={className}>{children}</td>
    )
}

export function Math({ children }: { children: string }) {
    return <StaticMathField className={css.math}>{children}</StaticMathField>
}
export function ShapesTable({ sets, setShape, vars, precision = 4 }: Props) {
    const hasDoubleRadii = sets.some(({shape}) => shape.kind === "XYRR" || shape.kind === "XYRRT")
    const hasXYRRT = sets.some(({shape}) => shape.kind === "XYRRT")
    return (
        <table className={css.shapesTable}>
            <thead>
            <tr>
                <th>Name</th>
                <th><Math>c_x</Math></th>
                <th><Math>c_y</Math></th>
                {
                    hasDoubleRadii
                        ? <>
                            <th><Math>r_x</Math></th>
                            <th><Math>r_y</Math></th>
                        </>
                        : <th><Math>r</Math></th>
                }
                {
                    hasXYRRT ? <th><Math>\theta</Math></th> : null
                }
                <th>
                    <OverlayTrigger
                        overlay={<Tooltip>Circle, XYRR (aligned ellipse), or XYRRT (unaligned ellipse)</Tooltip>}
                    >
                        <span>Type</span>
                    </OverlayTrigger>
                </th>
            </tr>
            </thead>
            <tbody>{
                sets.map(({ idx, name, shape }) => {
                    const skippedVars = vars.skipVars[idx] || []
                    const c = shape.c
                    const [ rx, ry ] = getRadii(shape)
                    const skipCx = skippedVars.includes("x")
                    const skipCy = skippedVars.includes("y")
                    const [ skipRx, skipRy ] = mapShape(
                        shape,
                        c => {
                            const skip = skippedVars.includes("r")
                            return [skip, skip]
                        },
                        e => [ skippedVars.includes("rx"), skippedVars.includes("ry") ],
                    )
                    return <tr key={idx}>
                        <td style={{ textAlign: "right", }}>{name}</td>
                        <VarCell skipped={skipCx}>{c.x.toPrecision(precision)}</VarCell>
                        <VarCell skipped={skipCy}>{c.y.toPrecision(precision)}</VarCell>
                        <VarCell skipped={skipRx}>{ rx.toPrecision(precision)}</VarCell>
                        { hasDoubleRadii && <VarCell skipped={skipRy}>{ ry.toPrecision(precision)}</VarCell> }
                        {
                            hasXYRRT &&
                            <VarCell skipped={skippedVars.includes("t")}>{
                                mapShape(
                                    shape,
                                    () => "",
                                    () => "",
                                    e => e.t.toPrecision(precision)
                                )
                            }</VarCell>
                        }
                        <td>
                            <select value={shape.kind} onChange={e => {
                                if (e.target.value === shape.kind) return
                                const r = { x: rx, y: ry }
                                switch (e.target.value) {
                                    case "Circle": setShape(idx, { kind: "Circle", c, r: sqrt(rx * ry) }); break
                                    case "XYRR": setShape(idx, { kind: "XYRR", c, r }); break
                                    case "XYRRT": setShape(idx, { kind: "XYRRT", c, r, t: 0 }); break
                                }
                            }}>
                                <option value={"Circle"}>Circle</option>
                                <option value={"XYRR"}>XYRR</option>
                                <option value={"XYRRT"}>XYRRT</option>
                            </select>
                        </td>
                    </tr>
                })
            }</tbody>
        </table>
    )
}
