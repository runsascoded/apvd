import {Model, Step} from "../../lib/regions";
import {Dual} from "apvd"
import React, {Dispatch, useCallback, useMemo, useState} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import {abs} from "../../lib/math";
import {makeTargets, Target, Targets} from "../../lib/targets";
import { fmt } from "../../lib/utils";

export function getNegativeEntries(targets: Targets): Map<string, number> {
    const entries: Target[] = []
    targets
        .exclusive
        .filter(([ _, v ]) => v < 0)
        .forEach(([ k, v ]) => {
            entries.push([k, v])
            const inclusiveKey = k.replaceAll('-', '*')
            const inclusiveVal = targets.all.get(inclusiveKey)
            if (inclusiveVal === undefined) {
                throw Error(`getNegativeKeys: inclusiveVal === undefined for key ${inclusiveKey}`)
            }
            entries.push([ inclusiveKey, inclusiveVal ])
        })
    return new Map(entries)
}

export function TargetsTable(
    { initialSets, targets, setTargets, showDisjointSets, model, curStep, error, stepIdx, hoveredRegion, ...sparkLineProps }: {
        initialSets: S[]
        targets: Targets
        setTargets: Dispatch<Targets>
        showDisjointSets: boolean
        model: Model
        curStep: Step
        error: Dual
        stepIdx: number
        hoveredRegion: string | null
    } & SparkLineProps
) {
    // console.log(`TargetsTable: ${initialShapes.length} shapes`)
    const [ negativeEntries, setNegativeEntries ] = useState<Map<string, number> | null>(null)
    const negativePropsEntries = useMemo(() => getNegativeEntries(targets), [ targets ])
    const targetName = useCallback(
        (key: string) =>
            key.split('').map((ch: string, idx: number) => {
                // console.log("initialShapes:", initialShapes, "idx:", idx)
                if (idx >= initialSets.length) {
                    console.warn("targetName: idx >= initialShapes.length", idx, initialSets.length)
                    return
                }
                const name = initialSets[idx].abbrev
                // console.log("targetName:", ch, idx, circle, initialCircles)
                if (ch === '*') {
                    return <span key={idx}>*</span>
                } else if (ch == '-') {
                    return <span key={idx} className={css.excludedSetId}>-</span>
                } else {
                    return <span key={idx}>{name}</span>
                }
            }),
        [ initialSets, ],
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
    const [ editingValue, setEditingValue ] = useState<[ string, string ] | null>(null)
    const totalTargetArea = curStep.targets.total_area
    const [ showTargetCurCol, setShowTargetCurCol ] = useState(false)
    const { showSparkLines } = sparkLineProps
    const cellProps = { model, stepIdx, ...sparkLineProps, }
    const targetTableRows = displayTargets.map(([ key, value ]) => {
        const name = targetName(key)
        const err = curStep.errors.get(key)
        const negativeKey = negativeEntries && negativeEntries.has(key) || negativePropsEntries.has(key)
        const activeRegion = key == hoveredRegion || (!(hoveredRegion && targetsMap.has(hoveredRegion)) && regionContains(key, hoveredRegion))
        const className = negativeKey ? css.negativeKey : activeRegion ? css.activeRegion : ''
        const valueStr =
            editingValue && editingValue[0] == key
                ? editingValue[1]
                : fmt(value, 4)
        return <tr className={className} key={key}>
            <td className={`${css.val} ${negativeKey}`}>{name}</td>
            <td className={`${css.val} ${css.targetVal}`}>
                <input
                    onFocus={e => {
                        console.log("onFocus:", key, e)
                        setEditingValue([ key, e.target.value ])
                    }}
                    onBlur={e => {
                        console.log("onBlur:", key, e)
                        if (editingValue && editingValue[0] == key) {
                            setEditingValue(null)
                        }
                    }}
                    type={"number"}
                    value={valueStr}
                    onKeyDown={e => { e.stopPropagation() }}
                    onKeyUp={e => { e.stopPropagation() }}
                    onChange={e => {
                        const newValueStr = e.target.value
                        const newValue = parseFloat(newValueStr)
                        console.log("onChange:", key, newValueStr, newValue, "isNaN(newValue):", isNaN(newValue))
                        setEditingValue([ key, newValueStr ])
                        if (isNaN(newValue)) {
                            return
                        }
                        const entries: Target[] = showDisjointSets ? targets.exclusive : targets.inclusive
                        const newEntries: Target[] = entries.map(([k, v]) => k == key ? [k, newValue] : [k, v])
                        const newTargets = makeTargets(newEntries)
                        const newNegativeEntries = getNegativeEntries(newTargets)
                        if (newNegativeEntries.size) {
                            console.log("negative entries:", newNegativeEntries)
                            setNegativeEntries(newNegativeEntries)
                        } else {
                            setNegativeEntries(null)
                        }
                        console.log("newTargets:", newTargets)
                        setTargets(newTargets)
                    }}
                />
            </td>
            {
                showTargetCurCol &&
                <td className={css.val}>{
                    err ? (err.actual_frac * totalTargetArea).toPrecision(3) : ''
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
                <th className={css.goalHeading}>Goal</th>
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
