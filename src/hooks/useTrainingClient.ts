/**
 * useTrainingClient - Hook for training using @apvd/client.
 *
 * This is a refactored version of useTraining that delegates step history
 * and training execution to the Worker via @apvd/client.
 *
 * Key differences from useTraining:
 * - No more OPFS paging on frontend (Worker handles tiered keyframes)
 * - Uses client.onProgress() for live updates
 * - Uses client.getStep() for time-travel scrubbing
 * - Simpler state management
 *
 * TODO: Full integration requires resolving type mismatch:
 * - Client's StepState only has: stepIndex, error, shapes, isKeyframe
 * - Frontend's Step type needs: regions, components, edges, points, total_area, errors
 *
 * The geometric data (regions, components, etc.) is computed by makeStep() from
 * raw WASM apvd.Step output. To complete the migration, either:
 * 1. Worker returns full apvd.Step data (more bandwidth per step), or
 * 2. Frontend calls WASM to compute regions from shapes for each step
 *
 * For now, useTraining remains the primary hook for the app.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  TrainingClient,
  TrainingHandle,
  ProgressUpdate,
  StepState,
  Shape,
  InputSpec,
  TargetsMap,
} from "@apvd/client"
import { useTrainingClient } from "../contexts/TrainingClientContext"
import { S, mapShape } from "../lib/shape"
import { Targets } from "../lib/targets"
import { CircleCoords, Coord, getPolygonCoords, makeVars, Vars, XYRRCoords, XYRRTCoords } from "../lib/vars"
import { RunningState } from "../types"

export type UseTrainingClientOptions = {
  initialSets: S[]
  targets: Targets
  maxSteps: number
  convergenceThreshold: number
  progressInterval?: number
}

export type UseTrainingClientResult = {
  // Training state
  handle: TrainingHandle | null
  isTraining: boolean
  progress: ProgressUpdate | null

  // Step navigation
  stepIdx: number | null
  setStepIdx: (idx: number) => void
  vStepIdx: number | null
  setVStepIdx: (idx: number | null) => void

  // Current step (for display)
  currentStep: StepState | null
  currentShapes: Shape[] | null
  currentError: number | null

  // Best step
  minStep: number | null
  minError: number | null

  // Navigation
  fwdStep: (n?: number) => void
  revStep: (n?: number) => void
  cantAdvance: boolean
  cantReverse: boolean

  // Controls
  runningState: RunningState
  setRunningState: (state: RunningState) => void
  startTraining: () => Promise<void>
  stopTraining: () => Promise<void>

  // Metadata
  totalSteps: number
  vars: Vars | null
  converged: boolean
}

export function useTrainingClientHook(options: UseTrainingClientOptions): UseTrainingClientResult {
  const {
    initialSets,
    targets,
    maxSteps,
    convergenceThreshold,
    progressInterval = 100,
  } = options

  const client = useTrainingClient()

  // Training state
  const [handle, setHandle] = useState<TrainingHandle | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)

  // Step navigation
  const [stepIdx, setStepIdxState] = useState<number | null>(null)
  const [vStepIdx, setVStepIdx] = useState<number | null>(null)
  const [runningState, setRunningState] = useState<RunningState>("none")

  // Current step state (loaded via getStep for time-travel)
  const [currentStep, setCurrentStep] = useState<StepState | null>(null)
  const [vars, setVars] = useState<Vars | null>(null)

  // Derived state
  const totalSteps = progress?.currentStep ?? 0
  const minStep = progress?.minStep ?? null
  const minError = progress?.minError ?? null
  const currentError = currentStep?.error ?? progress?.error ?? null
  const currentShapes = currentStep?.shapes ?? progress?.shapes ?? null

  const converged = useMemo(
    () => minError !== null && minError < convergenceThreshold,
    [minError, convergenceThreshold]
  )

  // Combined stepIdx (vStepIdx takes precedence for preview)
  const effectiveStepIdx = vStepIdx !== null ? vStepIdx : stepIdx

  const setStepIdx = useCallback((idx: number) => {
    setStepIdxState(idx)
    setVStepIdx(null)
  }, [])

  // Convert initialSets to InputSpec format
  const inputs: InputSpec[] = useMemo(() => {
    const vars = makeVars(initialSets)
    const { skipVars } = vars
    setVars(vars)

    return initialSets.map((set: S, shapeIdx: number) => {
      const shape = set.shape
      const coords: Coord[] = mapShape<number, Coord[]>(
        shape,
        () => CircleCoords,
        () => XYRRCoords,
        () => XYRRTCoords,
        (p) => getPolygonCoords(p.vertices.length),
      )
      const wasmShape: Shape = mapShape<number, Shape>(
        shape,
        s => ({ kind: "Circle", c: s.c, r: s.r }),
        s => ({ kind: "XYRR", c: s.c, r: s.r }),
        s => ({ kind: "XYRRT", c: s.c, r: s.r, t: s.t }),
        p => ({ kind: "Polygon", vertices: p.vertices }),
      )
      const trainable = coords.map(v =>
        shapeIdx >= skipVars.length || !skipVars[shapeIdx].includes(v)
      )
      return [wasmShape, trainable] as InputSpec
    })
  }, [initialSets])

  // Convert targets to TargetsMap format
  const targetsMap: TargetsMap = useMemo(() => {
    const map: TargetsMap = {}
    for (const [key, value] of targets.all) {
      map[key] = value
    }
    return map
  }, [targets.all])

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = client.onProgress((update) => {
      setProgress(update)

      // Update step index to follow training progress
      if (runningState === "fwd" && update.currentStep > (stepIdx ?? 0)) {
        setStepIdxState(update.currentStep)
      }

      if (update.type === "complete" || update.type === "error") {
        setIsTraining(false)
        setRunningState("none")
      }
    })

    return unsubscribe
  }, [client, runningState, stepIdx])

  // Load step when stepIdx changes (for time-travel)
  useEffect(() => {
    if (!handle || effectiveStepIdx === null) return
    if (effectiveStepIdx > totalSteps) return

    // If we're at the latest step, use progress.shapes directly
    if (effectiveStepIdx === totalSteps && progress?.shapes) {
      setCurrentStep({
        stepIndex: effectiveStepIdx,
        error: progress.error,
        shapes: progress.shapes,
        isKeyframe: false,
      })
      return
    }

    // Otherwise, fetch from Worker
    client.getStep(handle, effectiveStepIdx).then(step => {
      setCurrentStep(step)
    }).catch(err => {
      console.error("Failed to get step:", err)
    })
  }, [client, handle, effectiveStepIdx, totalSteps, progress])

  // Start training
  const startTraining = useCallback(async () => {
    if (inputs.length === 0) return

    setIsTraining(true)
    setProgress(null)
    setCurrentStep(null)
    setStepIdxState(0)

    try {
      const newHandle = await client.startTraining({
        inputs,
        targets: targetsMap,
        params: {
          maxSteps,
          convergenceThreshold,
          progressInterval,
        },
      })
      setHandle(newHandle)
    } catch (err) {
      console.error("Failed to start training:", err)
      setIsTraining(false)
    }
  }, [client, inputs, targetsMap, maxSteps, convergenceThreshold, progressInterval])

  // Stop training
  const stopTraining = useCallback(async () => {
    if (!handle) return
    try {
      await client.stopTraining(handle)
    } catch (err) {
      console.error("Failed to stop training:", err)
    }
    setIsTraining(false)
    setRunningState("none")
  }, [client, handle])

  // Auto-start training when inputs/targets change
  useEffect(() => {
    if (inputs.length > 0 && Object.keys(targetsMap).length > 0) {
      startTraining()
    }
  }, [inputs, targetsMap]) // Note: don't include startTraining to avoid infinite loop

  // Forward step
  const fwdStep = useCallback((n: number = 1) => {
    if (effectiveStepIdx === null) return
    const newIdx = Math.min(effectiveStepIdx + n, totalSteps)
    setStepIdx(newIdx)
  }, [effectiveStepIdx, totalSteps, setStepIdx])

  // Reverse step
  const revStep = useCallback((n: number = 1) => {
    if (effectiveStepIdx === null) return
    const newIdx = Math.max(effectiveStepIdx - n, 0)
    setStepIdx(newIdx)
  }, [effectiveStepIdx, setStepIdx])

  // Navigation constraints
  const cantAdvance = useMemo(
    () => effectiveStepIdx === null || effectiveStepIdx >= totalSteps || converged,
    [effectiveStepIdx, totalSteps, converged]
  )

  const cantReverse = useMemo(
    () => effectiveStepIdx === null || effectiveStepIdx <= 0,
    [effectiveStepIdx]
  )

  return {
    handle,
    isTraining,
    progress,
    stepIdx: effectiveStepIdx,
    setStepIdx,
    vStepIdx,
    setVStepIdx,
    currentStep,
    currentShapes,
    currentError,
    minStep,
    minError,
    fwdStep,
    revStep,
    cantAdvance,
    cantReverse,
    runningState,
    setRunningState,
    startTraining,
    stopTraining,
    totalSteps,
    vars,
    converged,
  }
}
