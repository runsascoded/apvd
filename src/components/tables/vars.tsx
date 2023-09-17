import {Step} from "../../lib/regions";
import {Dual} from "apvd";
import React, {useMemo} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineCellProps, SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import {Vars} from "../../lib/vars";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export function VarsTable(
    { vars, initialShapes, shapes, curStep, error, ...sparkLineCellProps }: {
        vars: Vars
        initialShapes: S[]
        shapes: S[]
        curStep: Step
        error: Dual
    } & SparkLineCellProps
) {
    const varTableRows = useMemo(
        () => {
            // console.log(`varTableRows: ${initialCircles.length} vs ${circles.length} circles, vars:`, vars.coords.length, vars)
            return vars.coords.map(([ circleIdx, coord ], varIdx ) =>
                circleIdx < shapes.length &&
                <tr key={varIdx}>
                    <td>{shapes[circleIdx].name}.{coord}</td>
                    {SparkNum(vars.getVal(curStep, varIdx))}
                    <SparkLineCell
                        color={"blue"}
                        fn={step => vars.getVal(step, varIdx)}
                        {...sparkLineCellProps}
                    />
                    {SparkNum(-error.d[varIdx])}
                    <SparkLineCell
                        color={"green"}
                        fn={step => step.error.d[varIdx]}
                        {...sparkLineCellProps}
                    />
                </tr>
            )
        },
        [ vars, initialShapes, shapes, ]
    )
    return (
        <table className={css.sparkLinesTable}>
            <thead>
            <tr>
                <th>Var</th>
                <th colSpan={2} style={{ textAlign: "center", }}>Value</th>
                <th colSpan={2} style={{ textAlign: "center", }}>
                    <OverlayTrigger overlay={<Tooltip>Gradient of decreasing error (-∂e/∂v)</Tooltip>}>
                        <span>Δ</span>
                    </OverlayTrigger>
                </th>
            </tr>
            </thead>
            <tbody>{varTableRows}</tbody>
        </table>
    )
}
