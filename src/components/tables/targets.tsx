import {Model, Step} from "../../lib/regions";
import {Dual} from "apvd";
import React, {useCallback, useMemo, useState} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import { abs } from "../../lib/math";
import {fromEntries} from "next-utils/objs";
import {Param} from "next-utils/params";

export type Target = [ string, number ]

export function makeKeys(n: number): string[] {
    if (n == 0) {
        return ['']
    }
    if (n >= 10) {
        throw new Error(`makeKeys: n >= 10: ${n}`)
    }
    const ch = (n - 1).toString()
    const suffixes = makeKeys(n - 1)
    return ([] as string[]).concat(
        suffixes.map(s => s + '-'),
        suffixes.map(s => s + ch),
    )
}

export function makeKeySet(n: number): string[] {
    const keySet = makeKeys(n)
    const [ first, ...rest ] = keySet
    const noneKey = String('-').repeat(n)
    if (first != noneKey) {
        throw new Error(`KeySets: first != String('-').repeat(i): ${first} != ${noneKey}`)
    }
    return rest
}
export const KeySets: { [length: number]: string[] } = fromEntries(
    Array(6).fill(0).map((_, i) => {
        const keySet = makeKeySet(i)
        return [ keySet.length, keySet, ]
    })
)

export const targetsParam: Param<Target[] | null> = {
    encode: (targets: Target[] | null): string | undefined => {
        if (!targets) {
            return undefined
        }
        if (!(targets.length in KeySets)) {
            throw new Error(`targetsParam: targets.length not in KeySets: ${targets.length}, {${Object.entries(KeySets).map(([ len ]) => len).join(', ')}}`)
        }
        const keys = KeySets[targets.length]
        const targetsMap = new Map(targets)
        return keys.map(key => {
            const val = targetsMap.get(key)
            if (val === undefined) {
                throw new Error(`targetsParam: !targetsMap.has(key): ${key}`)
            }
            return val.toString()
        }).join(',')
    },
    decode: (targets: string | undefined): Target[] | null => {
        if (targets === undefined) {
            return null
        }
        const values = targets.split(',')
        const len = values.length
        if (!(len in KeySets)) {
            throw new Error(`targetsParam: len not in KeySets: ${len}, {${Object.entries(KeySets).map(([ len ]) => len).join(', ')}}`)
        }
        const keys = KeySets[len]
        return values.map((value, idx) => [ keys[idx], parseFloat(value) ])
    }
}

export const makeSortKeys = (ch: string) => ([ a ]: Target, [ b ]: Target) => {
    let numSetsA = a.split('').filter(c => c != ch).length
    let numSetsB = b.split('').filter(c => c != ch).length
    if (numSetsA == numSetsB) {
        return -a.localeCompare(b)
    } else {
        return numSetsA - numSetsB
    }
}
export const inclusiveKeyCmp = makeSortKeys('*')
export const exclusiveKeyCmp = makeSortKeys('-')

export function TargetsTable(
    { initialShapes, targets, showDisjointSets, model, curStep, error, stepIdx, hoveredRegion, ...sparkLineProps }: {
        initialShapes: S[]
        targets: Map<string, number>
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

    const numShapes = useMemo(() => initialShapes.length, [ initialShapes, ])
    const [ noneKey, allKey ] = useMemo(() => [ '-'.repeat(numShapes), '*'.repeat(numShapes) ], [ numShapes, ])
    const [ exclusiveSets, inclusiveSets ] = useMemo(
        () => {
            const exclusiveSets: Target[] = []
            const inclusiveSets: Target[] = []
            // console.log("targets:", targets)
            targets.forEach((value, key) => {
                if (!key.includes('*') && key != noneKey) {
                    exclusiveSets.push([ key, value ])
                }
                if (!key.includes('-') && key != allKey) {
                    inclusiveSets.push([ key, value ])
                }
            })
            inclusiveSets.sort(inclusiveKeyCmp)
            exclusiveSets.sort(exclusiveKeyCmp)
            return [ exclusiveSets, inclusiveSets ]
        },
        [ targets, ]
    )

    const displayTargets = useMemo(
        () => showDisjointSets ? exclusiveSets : inclusiveSets,
        [ showDisjointSets, exclusiveSets, inclusiveSets, ],
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
