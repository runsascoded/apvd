import {Model, Step} from "../../lib/regions";
import {Dual} from "apvd";
import React, {useCallback, useState} from "react";
import css from "../../../pages/circles.module.scss";
import {SparkLineCell, SparkLineProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";

export type Target = {
    sets: string
    value: number
}

export function TargetsTable(
    { initialShapes, targets, model, curStep, error, stepIdx, ...sparkLineProps }: {
        initialShapes: S[]
        targets: Target[]
        model: Model
        curStep: Step
        error: Dual
        stepIdx: number
    } & SparkLineProps
) {
    const targetName = useCallback(
        (sets: string) =>
            sets.split('').map((ch: string, idx: number) => {
                const name = initialShapes[idx].name
                // console.log("targetName:", ch, idx, circle, initialCircles)
                if (ch === '*') {
                    return <span key={idx}></span>
                } else if (ch == '-') {
                    return <span key={idx} style={{textDecoration: "line-through",}}>{name}</span>
                } else {
                    return <span key={idx}>{name}</span>
                }
            }),
        [ initialShapes, ],
    )

    const [ showTargetCurCol, setShowTargetCurCol ] = useState(false)
    const cellProps = { model, stepIdx, ...sparkLineProps, }
    const targetTableRows = targets.map(({ sets, value}) => {
        const name = targetName(sets)
        const err = curStep.errors.get(sets)
        return <tr key={sets}>
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
                fn={step => step.errors.get(sets)?.error.v || 0}
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
            <tr>
                <td colSpan={2 + (showTargetCurCol ? 1 : 0)} style={{ textAlign: "right", fontWeight: "bold", }}>Overall:</td>
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
