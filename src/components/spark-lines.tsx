import css from "../../pages/circles.module.scss";
import {Model, Step} from "../lib/regions";
import {Sparklines, SparklinesLine} from "react-sparklines";
import {max} from "../lib/math";
import React from "react";

export const SparkNum = (v: number | null | undefined) =>
    <td className={css.sparkNum}>
        <span>{v === null || v === undefined ? '' : v.toPrecision(4)}</span>
    </td>

export function SparkLineCell(
    { color, fn, model, stepIdx, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, }: {
        color: string
        fn: (step: Step) => number
        model: Model
        stepIdx: number
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
    if (data.length < sparkLineLimit) {
        data = [ ...Array(sparkLineLimit - data.length).fill(data[0]), ...data ]
    }
    return <td>
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
    sparkLineLimit: number
    sparkLineStrokeWidth: number
    sparkLineMargin: number
    sparkLineWidth: number
    sparkLineHeight: number
}
export type SparkLineCellProps = SparkLineProps & {
    model: Model
    stepIdx: number
}
