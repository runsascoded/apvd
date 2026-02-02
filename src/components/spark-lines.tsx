import css from "../App.module.scss";
import {Model, Step} from "../lib/regions";
import {Sparklines, SparklinesLine} from "react-sparklines";
import {max} from "../lib/math";
import React from "react";

/** Sparkline cell that takes pre-computed array of values (for Worker-based training) */
export function ArraySparkLineCell(
    { data, color, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, className = '', }: {
        data: number[]
        color: string
        className?: string
    } & SparkLineProps
) {
    // Take most recent sparkLineLimit values, pad with first value if needed
    let displayData = data.slice(-sparkLineLimit)
    if (displayData.length < sparkLineLimit && displayData.length > 0) {
        displayData = [...Array(sparkLineLimit - displayData.length).fill(displayData[0]), ...displayData]
    }
    if (displayData.length === 0) {
        return <td className={className} style={{ width: sparkLineWidth, height: sparkLineHeight }}></td>
    }
    return <td className={className}>
        <Sparklines
            data={displayData}
            limit={sparkLineLimit}
            width={40} height={20}
            svgWidth={sparkLineWidth} svgHeight={sparkLineHeight}
            margin={sparkLineMargin}
        >
            <SparklinesLine
                color={color}
                style={{strokeWidth: sparkLineStrokeWidth,}}
            />
        </Sparklines>
    </td>
}

export const SparkNum = (v: number | null | undefined, className: string = '') =>
    <td className={`${css.sparkNum} ${className}`}>
        <span>{v === null || v === undefined ? '' : v.toPrecision(4)}</span>
    </td>

export function SparkLineCell(
    { color, fn, model, stepIdx, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, className = '', }: {
        color: string
        fn: (step: Step) => number | null
        model: Model
        stepIdx: number
        className?: string
    } & SparkLineProps
) {
    let data =
        model
            .steps
            .slice(
                max(0, stepIdx - sparkLineLimit),
                stepIdx + 1
            )
            .map(fn)
            .filter(v => v !== null) as number[]
    if (data.length < sparkLineLimit) {
        data = [ ...Array(sparkLineLimit - data.length).fill(data[0]), ...data ]
    }
    return <td className={className}>
        <Sparklines
            data={data}
            limit={sparkLineLimit}
            width={40} height={20}
            svgWidth={sparkLineWidth} svgHeight={sparkLineHeight}
            margin={sparkLineMargin}
        >
            <SparklinesLine
                color={color}
                style={{strokeWidth: sparkLineStrokeWidth,}}
                // onMouseMove={(e, v, { x, y }) => {
                //     console.log("sparkline mousemove:", e, v, x, y)
                // }}
            />
        </Sparklines>
    </td>
}

export type SparkLineProps = {
    showSparkLines: boolean
    sparkLineLimit: number
    sparkLineStrokeWidth: number
    sparkLineMargin: number
    sparkLineWidth: number
    sparkLineHeight: number
    sparklineColors: { red: string; green: string; blue: string }
}
export type SparkLineCellProps = SparkLineProps & {
    model: Model
    stepIdx: number
}
