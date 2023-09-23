import {Step} from "../../lib/regions";
import {Dual} from "apvd";
import React, {useMemo} from "react";
import css from "../../../pages/index.module.scss";
import {SparkLineCell, SparkLineCellProps, SparkNum} from "../spark-lines";
import {Set, S} from "../../lib/shape";
import {Vars} from "../../lib/vars";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export function VarsTable(
    { vars, sets, curStep, error, ...sparkLineCellProps }: {
        vars: Vars
        sets: S[]
        curStep: Step
        error: Dual
    } & SparkLineCellProps
) {
    const { showSparkLines} = sparkLineCellProps
    const varTableRows = useMemo(
        () => {
            // console.log(`varTableRows: ${initialCircles.length} vs ${circles.length} circles, vars:`, vars.coords.length, vars)
            return vars.coords.map(([ setIdx, coord ], varIdx ) =>
                setIdx < sets.length &&
                <tr key={varIdx}>
                    <td>{sets[setIdx].name}.{coord}</td>
                    {SparkNum(vars.getVal(curStep, varIdx))}
                    {showSparkLines && <SparkLineCell
                        color={"blue"}
                        fn={step => vars.getVal(step, varIdx)}
                        {...sparkLineCellProps}
                    />}
                    {SparkNum(-error.d[varIdx])}
                    {showSparkLines && <SparkLineCell
                        color={"green"}
                        fn={step => step.error.d[varIdx]}
                        {...sparkLineCellProps}
                    />}
                </tr>
            )
        },
        [ vars, sets, showSparkLines, ]
    )
    return (
        <table className={css.sparkLinesTable}>
            <thead>
            <tr>
                <th>Var</th>
                <th colSpan={showSparkLines ? 2 : 1} style={{ textAlign: "center", }}>Value</th>
                <th colSpan={showSparkLines ? 2 : 1} style={{ textAlign: "center", }}>
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
