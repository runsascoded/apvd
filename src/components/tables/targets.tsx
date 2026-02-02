import {Step} from "../../lib/regions";
import {Dual} from "apvd-wasm"
import React, {Dispatch, useCallback, useMemo, useState} from "react";
import css from "../../App.module.scss";
import {ArraySparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
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
    { initialSets, targets, setTargets, showDisjointSets, curStep, error, hoveredRegion, setHoveredRegion, regionErrorHistory, ...sparkLineProps }: {
        initialSets: S[]
        targets: Targets
        setTargets: Dispatch<Targets>
        showDisjointSets: boolean
        curStep: Step
        error: Dual
        hoveredRegion: string | null
        setHoveredRegion: Dispatch<string | null>
        /** Per-region error history for sparklines (regionKey -> array of error values) */
        regionErrorHistory: Record<string, number[]>
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
    const { showSparkLines, sparkLineWidth, sparkLineHeight, sparklineColors } = sparkLineProps

    // Compute max absolute error for normalizing error bars
    const maxAbsError = useMemo(() => {
        let max = 0
        displayTargets.forEach(([key]) => {
            const err = curStep.errors.get(key)
            if (err) {
                max = Math.max(max, abs(err.error.v * totalTargetArea))
            }
        })
        return max || 1  // Avoid division by zero
    }, [displayTargets, curStep.errors, totalTargetArea])

    // Sparklines are enabled when we have region error history data
    const hasRegionHistory = Object.keys(regionErrorHistory).length > 0

    const targetTableRows = displayTargets.map(([ key, value ]) => {
        const name = targetName(key)
        const err = curStep.errors.get(key)
        const negativeKey = negativeEntries && negativeEntries.has(key) || negativePropsEntries.has(key)
        const activeRegion = key == hoveredRegion || (!(hoveredRegion && targetsMap.has(hoveredRegion)) && regionContains(key, hoveredRegion))

        // Error bar calculation
        const errorVal = err ? err.error.v * totalTargetArea : 0
        const errorBarWidth = maxAbsError > 0 ? (abs(errorVal) / maxAbsError) * 100 : 0
        // Check for "infinite" error cases: missing region (should exist but doesn't) or extra region (exists but shouldn't)
        const isMissing = err && err.actual_area === null && value > 0
        const isExtra = err && err.actual_area !== null && err.actual_area > 0 && value === 0

        const className = [
            negativeKey ? css.negativeKey : '',
            activeRegion ? css.activeRegion : '',
            isMissing ? css.missingRow : '',
        ].filter(Boolean).join(' ')
        const valueStr =
            editingValue && editingValue[0] == key
                ? editingValue[1]
                : fmt(value)

        return <tr
            className={className}
            key={key}
            onMouseEnter={() => setHoveredRegion(key)}
            onMouseLeave={() => setHoveredRegion(null)}
        >
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
            <td className={css.errorBarCell}>
                <div
                    className={`${css.errorBar} ${isMissing ? css.missingRegion : ''} ${isExtra ? css.extraRegion : ''}`}
                    style={{ width: `${errorBarWidth}%` }}
                    title={isMissing ? 'Missing region' : isExtra ? 'Extra region' : undefined}
                />
            </td>
            {showSparkLines && (hasRegionHistory
                ? <ArraySparkLineCell
                    data={regionErrorHistory[key] || []}
                    color={sparklineColors.red}
                    {...sparkLineProps}
                />
                : <td className={css.sparkLineCell} style={{ width: sparkLineWidth, height: sparkLineHeight }}></td>
            )}
        </tr>
    })

    return (
        <table className={css.sparkLinesTable}>
            <thead>
            <tr>
                <th></th>
                <th className={css.goalHeading}>Goal</th>
                {showTargetCurCol && <th>Cur</th>}
                <th style={{ textAlign: "center" }} colSpan={showSparkLines ? 3 : 2}>Error</th>
            </tr>
            </thead>
            <tbody>
            {targetTableRows}
            <tr className={css.totalRow}>
                <td style={{ textAlign: "right", }}>Σ</td>
                <td className={css.sparkNum}>{sum}</td>
                {SparkNum(error.v * totalTargetArea)}
                <td className={css.errorBarCell}></td>
                {showSparkLines && (
                    <td className={css.sparkLineCell} style={{ width: sparkLineWidth, height: sparkLineHeight }}></td>
                )}
            </tr>
            </tbody>
        </table>
    )
}
