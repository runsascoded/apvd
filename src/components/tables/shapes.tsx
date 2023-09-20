import {getCenter, getRadii, mapShape, S, shapeType} from "../../lib/shape";
import React, {ReactNode} from "react";
import {Vars} from "../../lib/vars";
import css from "./shapes.module.scss"
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export type Props = {
    sets: S[]
    vars: Vars
    precision?: number
}

export function VarCell({ skipped, children }: { skipped: boolean, children: ReactNode }) {
    return (
        skipped
            ? <OverlayTrigger overlay={<Tooltip>Fixed/disabled</Tooltip>}>
                <td className={css.skipped}>
                    <span>{children}</span>
                </td>
            </OverlayTrigger>
            : <td>{children}</td>
    )
}

export function ShapesTable({ sets, vars, precision = 4 }: Props) {
    return (
        <table className={css.shapesTable}>
            <thead>
            <tr>
                <th>Name</th>
                <th>x</th>
                <th>y</th>
                <th>rx</th>
                <th>ry</th>
                <th>Type</th>
            </tr>
            </thead>
            <tbody>{
                sets.map(({ idx, name, shape }) => {
                    const skippedVars = vars.skipVars[idx] || []
                    const c = getCenter(shape)
                    const [ rx, ry ] = getRadii(shape)
                    const skipCx = skippedVars.includes("x")
                    const skipCy = skippedVars.includes("y")
                    const [ skipRx, skipRy ] = mapShape(
                        shape,
                        c => {
                            const skip = skippedVars.includes("r")
                            return [skip, skip]
                        },
                        e => [ skippedVars.includes("rx"), skippedVars.includes("ry") ]
                    )
                    return <tr key={idx}>
                        <td style={{ textAlign: "right", }}>{name}</td>
                        <VarCell skipped={skipCx}>{c.x.toPrecision(precision)}</VarCell>
                        <VarCell skipped={skipCy}>{c.y.toPrecision(precision)}</VarCell>
                        <VarCell skipped={skipRx}>{ rx.toPrecision(precision)}</VarCell>
                        <VarCell skipped={skipRy}>{ ry.toPrecision(precision)}</VarCell>
                        <td>{shapeType(shape)}</td>
                    </tr>
                })
            }</tbody>
        </table>
    )
}
