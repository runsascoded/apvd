import { getRadii, mapShape, S, SetMetadatum, Shape } from "../../lib/shape";
import React, { Dispatch, ReactNode, useCallback, useState } from "react";
import {Vars} from "../../lib/vars";
import css from "./shapes.module.scss"
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import dynamic from "next/dynamic";
import { deg, PI, round, sqrt } from "../../lib/math";
import useSessionStorageState from "use-session-storage-state";
import { EditableText } from "../editable-text";
const StaticMathField = dynamic(() => import("react-mathquill").then(m => { m.addStyles(); return m.StaticMathField }), { ssr: false })

export type CopyCoordinatesType = "JS" | "Rust" | "JSON" | "URL"

export type Props = {
    sets: S[]
    setShape: (idx: number, shape: Shape<number>) => void
    updateSetMetadatum: (idx: number, newMetadatum: Partial<SetMetadatum>) => void
    vars: Vars
    precision?: number
}

export type Var = {
    skip: boolean
    value: number
    set: Dispatch<number>
}

export function VarCell({ skip, value, set, parse, render, className, }: Var & {
    parse?: (value: string) => number | null
    render?: (value: number) => string
    className?: string
}) {
    className = (className || css.varCell) + ` ${skip ? css.skipped : ''}`
    render = render || (v => `${v}`)
    const valueStr = render(value)
    const cell = <td className={className}>
        <EditableText
            className={css.editableShapeField}
            defaultValue={valueStr}
            onChange={s => {
                const newValue = parse ? parse(s) : parseFloat(s)
                if (newValue === null || isNaN(newValue)) return
                set(newValue)
            }}
        />
    </td>
    return (
        skip
            ? <OverlayTrigger overlay={<Tooltip>Fixed/disabled</Tooltip>}>{cell}</OverlayTrigger>
            : cell
    )
}

export function Math({ children }: { children: string }) {
    return <StaticMathField className={css.math}>{children}</StaticMathField>
}

export function ShapesTable({ sets, setShape, updateSetMetadatum, vars, precision = 4 }: Props) {
    const hasDoubleRadii = sets.some(({shape}) => shape.kind === "XYRR" || shape.kind === "XYRRT")
    const hasXYRRT = sets.some(({shape}) => shape.kind === "XYRRT")
    const [ showShapesMetadata, setShowShapesMetadata ] = useSessionStorageState("showShapesMetadata", { defaultValue: true })
    const nameHeader = <th className={css.shapeNameHeader}>
        Name{' '}
        <OverlayTrigger overlay={<Tooltip>
            Toggle between displaying shapes' coordinates vs. other metadata (abbreviated name, color, shape type)
        </Tooltip>}>
            <span
                className={css.toggleSetMetadataButton}
                onClick={() => { setShowShapesMetadata(!showShapesMetadata) }}
            >🔄</span>
        </OverlayTrigger>
    </th>
    const headerRow = showShapesMetadata
        ? <tr>
            {nameHeader}
            <th className={css.abbrevCol}>
                <OverlayTrigger overlay={<Tooltip>Abbreviated name: one character, used in "Targets" table</Tooltip>}>
                    <span>Key</span>
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
            {nameHeader}
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
    const render = useCallback((v: number) => v.toPrecision(precision), [ precision ])
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
                    const cxVar = { skip: skippedVars.includes("x"), value: c.x, set: (x: number) => setShape(idx, { ...shape, c: { x, y: shape.c.y } }) }
                    const cyVar = { skip: skippedVars.includes("y"), value: c.y, set: (y: number) => setShape(idx, { ...shape, c: { y, x: shape.c.x } }) }
                    const [ rxVar, ryVar ]: [ Var, Var ] = mapShape(
                        shape,
                        c => {
                            const skip = skippedVars.includes("r")
                            return [
                                { skip, value: c.r, set: (r: number) => setShape(idx,  { ...c, r }) },
                                { skip, value: c.r, set: (r: number) => setShape(idx,  { ...c, r }) },
                            ]
                        },
                        e => [
                            { skip: skippedVars.includes("rx"), value: e.r.x, set: (x: number) => setShape(idx, { ...e, r: { x, y: ry }}), },
                            { skip: skippedVars.includes("ry"), value: e.r.y, set: (y: number) => setShape(idx, { ...e, r: { y, x: rx }}), },
                        ],
                    )
                    const tVar = mapShape(
                        shape,
                        () => null,
                        () => null,
                        e => ({ skip: skippedVars.includes("t"), value: e.t, set: (t: number) => setShape(idx, { ...e, t }) }),
                    )
                    return <tr key={idx}>
                        <td style={{ textAlign: "right", }}>
                            <EditableText
                                className={css.editableShapeField}
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
                                <td className={css.abbrevCol}>
                                    <EditableText
                                        className={css.shapeAbbrev}
                                        defaultValue={abbrev}
                                        onChange={newAbbrev => {
                                            console.log(`shape ${idx} abbrev changed from ${name} to ${newAbbrev}`)
                                            if (!newAbbrev) return
                                            let newChar = newAbbrev.split('').find((ch, idx) => idx >= abbrev.length || ch != abbrev[idx])
                                            if (newChar) {
                                                updateSetMetadatum(idx, { abbrev: newChar })
                                                return newChar
                                            }
                                        }}
                                    />
                                </td>
                                <td>
                                    <EditableText
                                        className={css.editableShapeField}
                                        defaultValue={color}
                                        onChange={newColor => {
                                            if (!newColor) return
                                            if (CSS.supports("color", newColor)) {
                                                updateSetMetadatum(idx, { color: newColor })
                                            }
                                        }}
                                    />
                                </td>
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
                                        <option value={"XYRR"}>Ellipse (aligned)</option>
                                        <option value={"XYRRT"}>Ellipse</option>
                                    </select>
                                </td>
                            </> : <>
                                <VarCell {...cxVar} render={render} />
                                <VarCell {...cyVar} render={render} />
                                <VarCell {...rxVar} render={render} />
                                { hasDoubleRadii && <VarCell {...ryVar} render={render} /> }
                                { hasXYRRT && tVar && <VarCell className={css.thetaVarCell} {...tVar} render={v => `${round(deg(v))}`} parse={s => parseFloat(s) * PI / 180} /> }
                            </>
                        }
                    </tr>
                })
            }</tbody>
        </table>
    )
}
