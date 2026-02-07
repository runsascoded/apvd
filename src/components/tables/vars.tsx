import {Step} from "../../lib/regions";
import {Dual} from "@apvd/wasm";
import React, {useMemo} from "react";
import css from "../../App.module.scss";
import {SparkNum} from "../spark-lines";
import {S} from "../../lib/shape";
import {Vars} from "../../lib/vars";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export function VarsTable(
    { vars, sets, curStep, error }: {
        vars: Vars
        sets: S[]
        curStep: Step
        error: Dual
    }
) {
    // Note: Sparklines are disabled with Worker-based training since we don't have
    // step history on the main thread. Can be re-enabled with a step history cache.
    const showSparkLines = false
    const varTableRows = useMemo(
        () => {
            // console.log(`varTableRows: ${initialCircles.length} vs ${circles.length} circles, vars:`, vars.coords.length, vars)
            return vars.coords.map(([ setIdx, coord ], varIdx ) =>
                setIdx < sets.length &&
                <tr key={varIdx}>
                    <td>{sets[setIdx].name}.{coord}</td>
                    {SparkNum(vars.getVal(curStep, varIdx))}
                    {SparkNum(-error.d[varIdx])}
                </tr>
            )
        },
        [ curStep, vars, sets, ]
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
