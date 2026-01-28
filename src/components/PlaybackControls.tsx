import React, { ReactNode, useCallback, useState } from "react"
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { Model, Step } from "../lib/regions"
import { RunningState } from "../types"
import { getSliderValue } from "./inputs"
import { useSettings } from "../contexts/SettingsContext"
import css from "../App.module.scss"

// Individual playback button component
function PlaybackButton({ title, hotkey, onClick, disabled, animating, setRunningState, children }: {
    title: string
    hotkey: string
    onClick: () => void
    disabled: boolean
    animating?: boolean
    setRunningState: (state: RunningState) => void
    children?: ReactNode
}) {
    const fullTitle = `${title} (${hotkey})`
    return (
        <OverlayTrigger overlay={<Tooltip>{fullTitle}</Tooltip>}>
            <span className={css.playbackControlButtonContainer}>
                <Button
                    className={css.playbackControlButton}
                    title={fullTitle}
                    onTouchEnd={e => {
                        onClick()
                        if (!animating) {
                            setRunningState("none")
                        }
                        e.stopPropagation()
                        e.preventDefault()
                    }}
                    onClick={e => {
                        onClick()
                        if (!animating) {
                            setRunningState("none")
                        }
                        e.stopPropagation()
                    }}
                    disabled={disabled}
                >
                    {children}
                </Button>
            </span>
        </OverlayTrigger>
    )
}

export type PlaybackControlsProps = {
    // Model state
    model: Model | null
    stepIdx: number | null
    curStep: Step | null
    bestStep: Step | null
    repeatSteps: [number, number] | null
    error: { v: number } | null | undefined
    // Running state
    runningState: RunningState
    setRunningState: (state: RunningState) => void
    // Step control
    setStepIdx: (idx: number) => void
    setVStepIdx: (idx: number | null) => void
    fwdStep: () => void
    revStep: () => void
    panZoom: () => void
    // Computed flags
    cantAdvance: boolean
    cantReverse: boolean
}

export function PlaybackControls({
    model,
    stepIdx,
    curStep,
    bestStep,
    repeatSteps,
    error,
    runningState,
    setRunningState,
    setStepIdx,
    setVStepIdx,
    fwdStep,
    revStep,
    panZoom,
    cantAdvance,
    cantReverse,
}: PlaybackControlsProps) {
    const { stepBatchSize, maxSteps } = useSettings()

    const PlaybackControl = useCallback(
        ({ title, hotkey, onClick, disabled, animating, children }: {
            title: string
            hotkey: string
            onClick: () => void
            disabled: boolean
            animating?: boolean
            children?: ReactNode
        }) => (
            <PlaybackButton
                title={title}
                hotkey={hotkey}
                onClick={onClick}
                disabled={disabled}
                animating={animating}
                setRunningState={setRunningState}
            >
                {children}
            </PlaybackButton>
        ),
        [setRunningState]
    )

    const FastForwardButton = useCallback(
        () => (
            <PlaybackControl
                title={runningState === "fwd" ? "Pause animation" : "Animate forward"}
                hotkey={"␣"}
                onClick={() => setRunningState(runningState === "fwd" ? "none" : "fwd")}
                disabled={cantAdvance}
                animating={true}
            >
                {runningState === "fwd" ? "⏸️" : "⏩"}
            </PlaybackControl>
        ),
        [runningState, setRunningState, cantAdvance, PlaybackControl]
    )

    // Track if mouse is pressed for drag-to-preview behavior
    const [isDragging, setIsDragging] = useState(false)

    return (
        <div className={css.controls}>
            <div className={css.slider}>
                {model && stepIdx !== null && (
                    <input
                        type="range"
                        value={stepIdx}
                        min={0}
                        max={model.steps.length - 1}
                        onChange={() => {}}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => {
                            setIsDragging(false)
                            setVStepIdx(null)
                        }}
                        onMouseMove={e => {
                            // Only preview while dragging (mouse button held)
                            if (isDragging) {
                                setVStepIdx(getSliderValue(e))
                            }
                        }}
                        onClick={e => {
                            setStepIdx(getSliderValue(e))
                            setRunningState("none")
                        }}
                        onMouseLeave={() => {
                            setIsDragging(false)
                            setVStepIdx(null)
                        }}
                    />
                )}
            </div>
            <div className={css.buttons}>
                <PlaybackControl
                    title="Rewind to start"
                    hotkey="⌘←"
                    onClick={() => setStepIdx(0)}
                    disabled={cantReverse}
                >
                    ⏮️
                </PlaybackControl>
                <PlaybackControl
                    title="Rewind"
                    hotkey="⇧␣"
                    onClick={() => setRunningState(runningState === "rev" ? "none" : "rev")}
                    disabled={cantReverse}
                    animating={true}
                >
                    {runningState === "rev" ? "⏸️" : "⏪️"}
                </PlaybackControl>
                <PlaybackControl
                    title="Reverse one step"
                    hotkey="←"
                    onClick={revStep}
                    disabled={cantReverse}
                >
                    ⬅️
                </PlaybackControl>
                <PlaybackControl
                    title={`Advance one ${stepIdx !== null && model && stepIdx + 1 === model.steps.length ? `batch (${stepBatchSize} steps)` : "step"}`}
                    hotkey="→"
                    onClick={fwdStep}
                    disabled={cantAdvance || stepIdx === maxSteps}
                >
                    ➡️
                </PlaybackControl>
                <FastForwardButton />
                <PlaybackControl
                    title="Jump to last computed step"
                    hotkey="⌘→"
                    onClick={() => {
                        if (!model) return
                        setStepIdx(model.steps.length - 1)
                        panZoom()
                    }}
                    disabled={!model || stepIdx === null || stepIdx + 1 === model.steps.length}
                >
                    ⏭️
                </PlaybackControl>
            </div>
            <div className={css.stepStats}>
                <p>
                    Step {stepIdx}
                    {curStep && error && (
                        <span>, error: {(error.v * curStep.targets.total_area).toPrecision(3)}</span>
                    )}
                </p>
                <p
                    onTouchStart={e => {
                        if (!model) return
                        setStepIdx(model.min_idx)
                        setRunningState("none")
                        e.stopPropagation()
                    }}
                    onMouseMove={() => {
                        if (!model || runningState !== 'none') return
                        setVStepIdx(model.min_idx)
                    }}
                    onMouseOut={() => setVStepIdx(null)}
                    onClick={() => {
                        if (!model) return
                        setStepIdx(model.min_idx)
                        setRunningState("none")
                    }}
                >
                    {model && curStep && bestStep && (
                        <span className={stepIdx === model.min_idx && runningState === 'none' && stepIdx > 0 ? css.bestStepActive : ''}>
                            Best step: {model.min_idx}, error: {(bestStep.error.v * curStep.targets.total_area).toPrecision(3)} ({(bestStep.error.v * 100).toPrecision(3)}%)
                        </span>
                    )}
                </p>
                {repeatSteps && stepIdx === repeatSteps[1] ? (
                    <p className={css.repeatSteps}>♻️ Step {repeatSteps[1]} repeats step {repeatSteps[0]}</p>
                ) : (
                    <p className={`${css.repeatSteps} ${css.invisible}`}>♻️ Step {"?"} repeats step {"?"}</p>
                )}
            </div>
        </div>
    )
}

// Export FastForwardButton for use in other places (e.g., examples section)
export function FastForwardButtonStandalone({
    runningState,
    setRunningState,
    cantAdvance,
}: {
    runningState: RunningState
    setRunningState: (state: RunningState) => void
    cantAdvance: boolean
}) {
    return (
        <PlaybackButton
            title={runningState === "fwd" ? "Pause animation" : "Animate forward"}
            hotkey="␣"
            onClick={() => setRunningState(runningState === "fwd" ? "none" : "fwd")}
            disabled={cantAdvance}
            animating={true}
            setRunningState={setRunningState}
        >
            {runningState === "fwd" ? "⏸️" : "⏩"}
        </PlaybackButton>
    )
}
