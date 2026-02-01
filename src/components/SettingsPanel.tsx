import React, { ReactNode, useState } from "react"
import { useSettings } from "../contexts/SettingsContext"
import { Details } from "./Details"
import { Checkbox, Control, Number, Select } from "./controls"
import { EditableText } from "./editable-text"
import { precisionSchemes } from "../lib/shapes-buffer"
import A from "./A"
import css from "../App.module.scss"

export type SettingsPanelProps = {
    // Grid state (not in context)
    showGrid: boolean
    setShowGrid: (v: boolean) => void
    // Summary buttons (passed from parent)
    summaryButtons: ReactNode
}

export function SettingsPanel({ showGrid, setShowGrid, summaryButtons }: SettingsPanelProps) {
    const {
        settingsShown, setSettingsShown,
        // Training
        maxErrorRatioStepSize, setMaxErrorRatioStepSize,
        maxSteps, setMaxSteps,
        stepBatchSize, setStepBatchSize,
        // Display
        showIntersectionPoints, setShowIntersectionPoints,
        autoCenter, setAutoCenter,
        showRegionSizes, setShowRegionSizes,
        shapeFillOpacity, setShapeFillOpacity,
        showSparkLines, setShowSparkLines,
        sparkLineLimit, setSparkLineLimit,
        svgBackgroundColor, setSvgBackgroundColor,
        // URL
        stateInUrlFragment, setStateInUrlFragment,
        urlShapesPrecisionScheme, setUrlShapesPrecisionScheme,
        // Misc
        logLevel, setLogLevel,
        // Reset
        resetAllSettings,
    } = useSettings()

    const [ invalidSvgColor, setInvalidSvgColor ] = useState(false)

    return (
        <Details
            open={settingsShown}
            toggle={setSettingsShown}
            summary={summaryButtons}
        >
            <Number
                label={"Max error ratio step size"}
                tooltip={"On each step, advance (along the gradients toward lower error) by this fraction of the current overall error"}
                value={maxErrorRatioStepSize} setValue={setMaxErrorRatioStepSize}
                float={true} min={0} max={1.2} step={0.1}
            />
            <Number label={"Max steps"} value={maxSteps} setValue={setMaxSteps} />
            <Number label={"Step batch size"} tooltip={"Advance by this many steps at a time (when at the end of the current model's history)"} className={css.shortNumberInput} value={stepBatchSize} setValue={setStepBatchSize} />
            <Checkbox label={"Intersections"} checked={showIntersectionPoints} setChecked={setShowIntersectionPoints} />
            <Checkbox label={"Grid"} checked={showGrid} setChecked={setShowGrid} />
            <Checkbox label={"Auto-center"} checked={autoCenter} setChecked={setAutoCenter} />
            <Checkbox label={"State in URL"} checked={stateInUrlFragment} setChecked={setStateInUrlFragment} />
            <Checkbox label={"Region sizes"} checked={showRegionSizes} setChecked={setShowRegionSizes} />
            <Select
                label={"URL shapes precision"}
                tooltip={<>
                    <p>{"Number of bits of precision to use for each shape's coordinates in URL: <mantissa>e<exponent>"}</p>
                    <p>Enables trading off some precision for shorter URLs</p>
                </>}
                value={urlShapesPrecisionScheme}
                setValue={setUrlShapesPrecisionScheme}>{
                precisionSchemes.map(({id, mantBits, expBits}, idx) =>
                    <option key={idx} value={idx}>{mantBits}e{expBits}</option>
                )
            }</Select>
            <Number label={"Sparklines"} className={css.shortNumberInput} value={sparkLineLimit} setValue={setSparkLineLimit}>
                <input
                    type={"checkbox"}
                    checked={showSparkLines}
                    onChange={e => setShowSparkLines(e.target.checked)}
                    onKeyDown={e => { e.stopPropagation() }}
                />
            </Number>
            <Select
                label={"WASM log level"}
                tooltip={<span>Set logging verbosity in WASM module (<A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>)</span>}
                value={logLevel}
                setValue={setLogLevel}
            >{
                ["debug", "info", "warn"].map(level =>
                    <option key={level} value={level}>{level}</option>
                )
            }</Select>
            <Control label={"SVG background"}>
                <EditableText
                    className={`${css.svgBackgroundColorInput} ${invalidSvgColor ? css.invalid : ""}`}
                    defaultValue={svgBackgroundColor}
                    onBlur={() => setInvalidSvgColor(false)}
                    onChange={(newColor) => {
                        if (newColor === '') {
                            console.log("svg color cleared, following theme")
                            setSvgBackgroundColor('')
                            setInvalidSvgColor(false)
                        } else if (CSS.supports("background-color", newColor)) {
                            console.log("new svg color:", newColor)
                            setSvgBackgroundColor(newColor)
                            setInvalidSvgColor(false)
                        } else {
                            setInvalidSvgColor(true)
                            console.log("invalid svg color:", newColor)
                        }
                    }}
                />
            </Control>
            <Number
                label={"Shape opacity"}
                className={css.shortNumberInput}
                value={shapeFillOpacity}
                setValue={setShapeFillOpacity}
                min={0}
                max={1}
                step={0.05}
                float={true}
            />
            <Control label={"Reset settings"}>
                <button
                    onClick={resetAllSettings}
                    title={"Clear all session storage settings and reload with defaults"}
                    style={{ padding: "2px 8px", cursor: "pointer" }}
                >
                    Reset to defaults
                </button>
            </Control>
        </Details>
    )
}
