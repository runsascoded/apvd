import {Model, Step} from "../../lib/regions";
import {Dual} from "apvd"
import React, {useCallback, useMemo, useState} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import {abs} from "../../lib/math";
import {Targets} from "../../lib/targets";

export function TargetsTable(
    { initialShapes, targets, showDisjointSets, model, curStep, error, stepIdx, hoveredRegion, ...sparkLineProps }: {
        initialShapes: S[]
        targets: Targets
        showDisjointSets: boolean
        model: Model
        curStep: Step
        error: Dual
        stepIdx: number
        hoveredRegion: string | null
    } & SparkLineProps
) {
    // console.log(`TargetsTable: ${initialShapes.length} shapes`)
    const targetName = useCallback(
        (key: string) =>
            key.split('').map((ch: string, idx: number) => {
                // console.log("initialShapes:", initialShapes, "idx:", idx)
                if (idx >= initialShapes.length) {
                    console.warn("targetName: idx >= initialShapes.length", idx, initialShapes.length)
                    return
                }
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

    const { inclusive, exclusive, } = targets

    const displayTargets = useMemo(
        () => showDisjointSets ? exclusive : inclusive,
        [ showDisjointSets, exclusive, inclusive, ],
    )

    const sum = useMemo(
        () => displayTargets.map(([ _, value ]) => value).reduce((a, b) => a + b),
        [ displayTargets, ],
    )

    const regionContains = useCallback(
        (key: string, region: string | null) => {
            if (region === null) {
                return false
            }
            if (key.length !== region.length) {
                console.error("regionContains: key.length !== region.length", key, region)
                return false
            }
            for (let i = 0; i < region.length; i++) {
                if (!(key[i] == '*' || key[i] == region[i] || region[i] != '-')) {
                    // console.log(`${key} doesn't contain ${region}`)
                    return false
                }
            }
            // console.log(`${key} contains ${region}`)
            return true
        },
        [],
    )

    const targetsMap = useMemo(
        () => new Map(displayTargets.map(([ key, value ]) => [ key, value ])),
        [ displayTargets, ],
    )

    const totalTargetArea = curStep.targets.total_area
    const [ showTargetCurCol, setShowTargetCurCol ] = useState(false)
    const { showSparkLines } = sparkLineProps
    const cellProps = { model, stepIdx, ...sparkLineProps, }
    const targetTableRows = displayTargets.map(([ key, value ]) => {
        const name = targetName(key)
        const err = curStep.errors.get(key)
        const activeRegion = key == hoveredRegion || (!(hoveredRegion && targetsMap.has(hoveredRegion)) && regionContains(key, hoveredRegion))
        return <tr className={activeRegion ? css.activeRegion : ''} key={key}>
            <td className={css.val}>{name}</td>
            <td className={css.val}>{value.toPrecision(3).replace(/\.?0+$/, '')}</td>
            {
                showTargetCurCol &&
                <td className={css.val}>{
                    err ? (err.actual_frac.v * totalTargetArea).toPrecision(3) : ''
                }</td>
            }
            {SparkNum(err && err.error.v * totalTargetArea)}
            {showSparkLines && <SparkLineCell
                color={"red"}
                fn={step => abs(step.errors.get(key)?.error.v || 0)}
                {...cellProps}
            />}
        </tr>
    })

    return (
        <table className={css.sparkLinesTable}>
            <thead>
            <tr>
                <th></th>
                <th>Goal</th>
                {showTargetCurCol && <th>Cur</th>}
                <th style={{ textAlign: "center" }} colSpan={showSparkLines ? 2 : 1}>Error</th>
            </tr>
            </thead>
            <tbody>
            {targetTableRows}
            <tr className={css.totalRow}>
                <td style={{ textAlign: "right", }}>Σ</td>
                <td className={css.sparkNum}>{sum}</td>
                {SparkNum(error.v * totalTargetArea)}
                {showSparkLines && <SparkLineCell
                    color={"red"}
                    fn={step => step.error.v}
                    {...cellProps}
                />}
            </tr>
            </tbody>
        </table>
    )
}
