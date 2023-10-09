import { getRadii, mapShape, S, SetMetadata, Shape } from "../../lib/shape";
import React, { ReactNode, useState } from "react";
import {Vars} from "../../lib/vars";
import css from "./shapes.module.scss"
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import dynamic from "next/dynamic";
import { deg, round, sqrt } from "../../lib/math";
const StaticMathField = dynamic(() => import("react-mathquill").then(m => { m.addStyles(); return m.StaticMathField }), { ssr: false })

export type Props = {
    sets: S[]
    showShapesMetadata: boolean
    setShape: (idx: number, shape: Shape<number>) => void
    updateSetMetadatum: (idx: number, newMetadatum: Partial<SetMetadata>) => void
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

export function EditableText({ className, defaultValue, onChange }: {
    className?: string
    defaultValue: string
    onChange: ((newValue: string) => string | undefined) | ((newValue: string) => void)
}) {
    const [ value, setValue ] = useState<string | null>(null)
    return (
        <input
            className={className || ''}
            type={"text"}
            value={value === null ? defaultValue : value}
            onFocus={e => { setValue(defaultValue) }}
            onBlur={e => { setValue(null) }}
            onChange={e => {
                const newValue = e.target.value
                const rv = onChange(newValue)
                setValue(rv === undefined ? newValue : rv)
            }}
            onKeyDown={e => { e.stopPropagation() }}
            onKeyUp={e => { e.stopPropagation() }}
        />
    )
}

export function Math({ children }: { children: string }) {
    return <StaticMathField className={css.math}>{children}</StaticMathField>
}
export function ShapesTable({ sets, showShapesMetadata, setShape, updateSetMetadatum, vars, precision = 4 }: Props) {
    const hasDoubleRadii = sets.some(({shape}) => shape.kind === "XYRR" || shape.kind === "XYRRT")
    const hasXYRRT = sets.some(({shape}) => shape.kind === "XYRRT")
    const [ editingName, setEditingName ] = useState<[ number, string ] | null>(null)
    const headerRow = showShapesMetadata
        ? <tr>
            <th>Name</th>
            <th>
                <OverlayTrigger overlay={<Tooltip>Abbreviated name: one character, used in Targets table</Tooltip>}>
                    <span>Abb.</span>
                </OverlayTrigger>
            </th>
            <th>Color</th>
            <th>
                <OverlayTrigger
                    overlay={<Tooltip>Circle, XYRR (aligned ellipse), or XYRRT (unaligned ellipse)</Tooltip>}
                >
                    <span>Type</span>
                </OverlayTrigger>
            </th>
        </tr> : <tr>
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
                hasXYRRT && <th>
                    <OverlayTrigger overlay={<Tooltip>Angle of rotation (counter-clockwise)</Tooltip>}>
                        <span><Math>\theta</Math></span>
                    </OverlayTrigger>
                </th>
            }
        </tr>
    return (
        <table className={css.shapesTable}>
            <thead>
            {headerRow}
            </thead>
            <tbody>{
                sets.map(({ idx, name, abbrev, color, shape }) => {
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
                    const editingNameStr = editingName && editingName[0] == idx ? editingName[1] : name
                    return <tr key={idx}>
                        <td style={{ textAlign: "right", }}>
                            <EditableText
                                className={css.shapeName}
                                defaultValue={name}
                                onChange={newName => {
                                    console.log(`shape ${idx} name changed from ${name} to ${newName}`)
                                    if (!newName) return
                                    updateSetMetadatum(idx, { name: newName })
                                }}
                            />
                        </td>
                        {
                            showShapesMetadata ? <>
                                <td>
                                    <EditableText
                                        className={css.shapeName}
                                        defaultValue={abbrev}
                                        onChange={newAbbrev => {
                                            console.log(`shape ${idx} abbrev changed from ${name} to ${newAbbrev}`)
                                            if (!newAbbrev) return
                                            let newChar = newAbbrev.split('').find((ch, idx) => ch != abbrev[idx])
                                            if (newChar) {
                                                updateSetMetadatum(idx, { abbrev: newChar })
                                                return newChar
                                            }
                                        }}
                                    />
                                </td>
                                <td>{color}</td>
                                <td>
                                    <select className={css.selectShapeType} value={shape.kind} onChange={e => {
                                        if (e.target.value === shape.kind) return
                                        const r = { x: rx, y: ry }
                                        switch (e.target.value) {
                                            case "Circle": setShape(idx, { kind: "Circle", c, r: sqrt(rx * ry) }); break
                                            case "XYRR": setShape(idx, { kind: "XYRR", c, r }); break
                                            case "XYRRT": setShape(idx, { kind: "XYRRT", c, r, t: 0 }); break
                                        }
                                    }}>
                                        <option value={"Circle"}>Circle</option>
                                        <option value={"XYRR"}>Ellipase (aligned)</option>
                                        <option value={"XYRRT"}>Ellipse</option>
                                    </select>
                                </td>
                            </> : <>
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
                                            e => `${round(deg(e.t))}°`
                                        )
                                    }</VarCell>
                                }
                            </>
                        }
                    </tr>
                })
            }</tbody>
        </table>
    )
}
