import {Model, Step} from "../../lib/regions";
import {Dual} from "apvd";
import React, {useCallback, useMemo, useState} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import { abs } from "../../lib/math";

export type Target = {
    sets: string
    value: number
}

export function TargetsTable(
    { initialShapes, targets, model, curStep, error, stepIdx, hoveredRegion, ...sparkLineProps }: {
        initialShapes: S[]
        targets: Target[]
        model: Model
        curStep: Step
        error: Dual
        stepIdx: number
        hoveredRegion: string | null
    } & SparkLineProps
) {
    const targetName = useCallback(
        (sets: string) =>
            sets.split('').map((ch: string, idx: number) => {
                const name = initialShapes[idx].name
                // console.log("targetName:", ch, idx, circle, initialCircles)
                if (ch === '*') {
                    return <span key={idx}>*</span>
                } else if (ch == '-') {
                    return <span key={idx} className={css.excludedSetId}>-</span>
                } else {
                    return <span key={idx}>{name}</span>
                }
            }),
        [ initialShapes, ],
    )

    const sum = useMemo(
        () => targets.map(({ value }) => value).reduce((a, b) => a + b, 0),
        [ targets, ],
    )

    const regionContains = useCallback(
        (sets: string, region: string | null) => {
            if (region === null) {
                return false
            }
            if (sets.length !== region.length) {
                console.error("regionContains: sets.length !== region.length", sets, region)
                return false
            }
            for (let i = 0; i < region.length; i++) {
                if (!(sets[i] == '*' || sets[i] == region[i] || region[i] != '-')) {
                    // console.log(`${sets} doesn't contain ${region}`)
                    return false
                }
            }
            // console.log(`${sets} contains ${region}`)
            return true
        },
        [],
    )

    const targetsMap = useMemo(
        () => new Map(targets.map(({ sets, value }) => [ sets, value ])),
        [ targets, ],
    )

    const [ showTargetCurCol, setShowTargetCurCol ] = useState(false)
    const cellProps = { model, stepIdx, ...sparkLineProps, }
    const targetTableRows = targets.map(({ sets, value}) => {
        const name = targetName(sets)
        const err = curStep.errors.get(sets)
        const activeRegion = sets == hoveredRegion || (!(hoveredRegion && targetsMap.has(hoveredRegion)) && regionContains(sets, hoveredRegion))
        return <tr className={activeRegion ? css.activeRegion : ''} key={sets}>
            <td className={css.val}>{name}</td>
            <td className={css.val}>{value.toPrecision(3).replace(/\.?0+$/, '')}</td>
            {
                showTargetCurCol &&
                <td className={css.val}>{
                    err ? (err.actual_frac.v * err.total_target_area).toPrecision(3) : ''
                }</td>
            }
            {SparkNum(err && err.error.v * err.total_target_area)}
            <SparkLineCell
                color={"red"}
                fn={step => abs(step.errors.get(sets)?.error.v || 0)}
                {...cellProps}
            />
        </tr>
    })

    return (
        <table className={css.sparkLinesTable}>
            <thead>
            <tr>
                <th></th>
                <th>Goal</th>
                {showTargetCurCol && <th>Cur</th>}
                <th style={{ textAlign: "center" }} colSpan={2}>Error</th>
            </tr>
            </thead>
            <tbody>
            {targetTableRows}
            <tr className={css.totalRow}>
                <td style={{ textAlign: "right", }}>Σ</td>
                <td className={css.sparkNum}>{sum}</td>
                {SparkNum(error.v * curStep.total_target_area)}
                <SparkLineCell
                    color={"red"}
                    fn={step => step.error.v}
                    {...cellProps}
                />
            </tr>
            </tbody>
        </table>
    )
}
