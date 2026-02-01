/**
 * useTrainingClient - Hook for training using @apvd/client session-based API.
 *
 * Uses session-based training: startTraining() creates a session on first load,
 * continueTraining() computes more steps on demand while preserving model state.
 *
 * Key features:
 * - Session-based training (preserves optimizer state/momentum between batches)
 * - Worker maintains WASM model state
 * - Steps stored locally in memory for display and sparklines
 * - fwdStep calls continueTraining() when at end of history
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Shape, InputSpec, TargetsMap, TrainingHandle } from "@apvd/client"
import * as apvd from "apvd-wasm"
import { useTrainingClient, ContinueTrainingResult } from "../contexts/TrainingClientContext"
import { S, mapShape, Set } from "../lib/shape"
import { Targets } from "../lib/targets"
import { makeStep, Step } from "../lib/regions"
import { CircleCoords, Coord, getPolygonCoords, makeVars, Vars, XYRRCoords, XYRRTCoords } from "../lib/vars"
import { RunningState } from "../types"

/**
 * Extracts plain JS number from a WASM value that may be wrapped in Dual { v: number }.
 */
function extractNumber(val: unknown): number {
  if (typeof val === "number") return val
  if (val && typeof val === "object" && "v" in val) return (val as { v: number }).v
  throw new Error(`Cannot extract number from ${JSON.stringify(val)}`)
}

function extractPoint(pt: unknown): { x: number; y: number } {
  const p = pt as { x: unknown; y: unknown }
  return { x: extractNumber(p.x), y: extractNumber(p.y) }
}

/**
 * Converts WASM Shape<Dual> to plain Shape<number> by extracting values.
 */
function extractShape(wasmShape: unknown): Shape {
  const s = wasmShape as { kind: string; c?: unknown; r?: unknown; t?: unknown; vertices?: unknown[] }
  if (s.kind === "Circle") {
    return {
      kind: "Circle",
      c: extractPoint(s.c),
      r: extractNumber(s.r),
    }
  } else if (s.kind === "XYRR") {
    return {
      kind: "XYRR",
      c: extractPoint(s.c),
      r: extractPoint(s.r),
    }
  } else if (s.kind === "XYRRT") {
    return {
      kind: "XYRRT",
      c: extractPoint(s.c),
      r: extractPoint(s.r),
      t: extractNumber(s.t),
    }
  } else {
    // Polygon
    const vertices = (s.vertices ?? []).map(v => extractPoint(v))
    return { kind: "Polygon", vertices }
  }
}

function extractShapes(wasmShapes: unknown[]): Shape[] {
  return wasmShapes.map(s => extractShape(s))
}

export type UseTrainingClientOptions = {
  initialSets: S[]
  targets: Targets
  maxSteps: number
  stepBatchSize: number
  learningRate: number
  convergenceThreshold: number
}

export type UseTrainingClientResult = {
  // Step navigation
  stepIdx: number | null
  setStepIdx: (idx: number) => void
  vStepIdx: number | null
  setVStepIdx: (idx: number | null) => void

  // Current step (FE Step type with object references for rendering)
  curStep: Step | null

  // Best step tracking
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

  // Metadata
  totalSteps: number
  vars: Vars | null
  converged: boolean

  // Error data for plotting
  modelErrors: number[]

  // Loading state
  isComputing: boolean

  // Export/import
  exportTrace: () => TraceExport | null
  downloadTrace: () => void
}

// Local step storage
interface StoredStep {
  shapes: Shape[]
  error: number
}

// Trace export format for saving/loading full training runs
export interface TraceExport {
  version: 1
  timestamp: string
  // Initial configuration
  inputs: InputSpec[]
  targets: TargetsMap
  params: {
    learningRate: number
    convergenceThreshold: number
  }
  // Results
  totalSteps: number
  minStep: number
  minError: number
  // Tiered keyframes (sparse - power-of-2 steps)
  keyframes: Array<{
    stepIndex: number
    error: number
    shapes: Shape[]
  }>
  // All per-step errors (dense - for error plot)
  errors: number[]
}

export function useTrainingClientHook(options: UseTrainingClientOptions): UseTrainingClientResult {
  const {
    initialSets,
    targets,
    maxSteps,
    stepBatchSize,
    learningRate,
    convergenceThreshold,
  } = options

  const client = useTrainingClient()

  // Session handle (for session-based training)
  const [sessionHandle, setSessionHandle] = useState<TrainingHandle | null>(null)

  // Step history (stored locally for display and sparklines)
  const [steps, setSteps] = useState<StoredStep[]>([])
  const [modelErrors, setModelErrors] = useState<number[]>([])

  // Best step tracking
  const [minStep, setMinStep] = useState<number | null>(null)
  const [minError, setMinError] = useState<number | null>(null)

  // Step navigation
  const [stepIdx, setStepIdxState] = useState<number | null>(null)
  const [vStepIdx, setVStepIdx] = useState<number | null>(null)
  const [runningState, setRunningState] = useState<RunningState>("none")

  // Current step (FE Step type for rendering)
  const [curStep, setCurStep] = useState<Step | null>(null)

  // Loading state
  const [isComputing, setIsComputing] = useState(false)

  // Ref to track current inputs for session creation
  const currentInputsRef = useRef<InputSpec[]>([])

  // Derived state
  const totalSteps = steps.length

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

  // Compute vars from initialSets (separate from inputs to avoid setting state in useMemo)
  const computedVars = useMemo(() => makeVars(initialSets), [initialSets])

  // Convert initialSets to InputSpec format
  const inputs: InputSpec[] = useMemo(() => {
    const { skipVars } = computedVars

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
  }, [initialSets, computedVars])

  // Convert targets to TargetsMap format
  const targetsMap: TargetsMap = useMemo(() => {
    const map: TargetsMap = {}
    for (const [key, value] of targets.all) {
      map[key] = value
    }
    return map
  }, [targets.all])

  // Convert stored shapes to FE Step type
  const shapesToStep = useCallback((shapes: Shape[]): Step | null => {
    if (shapes.length !== initialSets.length) return null

    // Build InputSpec array from shapes, creating trainable arrays based on shape kind
    const stepInputs: InputSpec[] = shapes.map((shape, idx) => {
      // Determine trainable array length based on shape kind
      let trainableLength: number
      switch (shape.kind) {
        case "Circle": trainableLength = 3; break      // x, y, r
        case "XYRR": trainableLength = 4; break        // x, y, rx, ry
        case "XYRRT": trainableLength = 5; break       // x, y, rx, ry, t
        case "Polygon": trainableLength = shape.vertices.length * 2; break  // x, y per vertex
        default: trainableLength = 5; break
      }
      // All coordinates are trainable for now (can be refined later with skipVars)
      const trainable = Array(trainableLength).fill(true)
      return [shape, trainable] as InputSpec
    })

    // Call make_step to get full geometry (components, regions, etc.)
    const wasmStep = apvd.make_step(stepInputs as any, targetsMap)
    return makeStep(wasmStep, initialSets as Set[])
  }, [targetsMap, initialSets])

  // Track previous initialSets/targets to detect changes
  const prevInitialSetsRef = useRef<S[]>(initialSets)
  const prevTargetsRef = useRef<Targets>(targets)

  // Reset state when initialSets or targets change (layout/example change)
  useEffect(() => {
    const setsChanged = initialSets !== prevInitialSetsRef.current
    const targetsChanged = targets !== prevTargetsRef.current

    if (setsChanged || targetsChanged) {
      // Stop any existing session
      if (sessionHandle) {
        client.stopTraining(sessionHandle).catch(console.error)
      }

      // Reset all state for new layout/targets
      setSessionHandle(null)
      setSteps([])
      setModelErrors([])
      setMinStep(null)
      setMinError(null)
      setStepIdxState(null)
      setCurStep(null)
      setRunningState("none")
      currentInputsRef.current = []

      prevInitialSetsRef.current = initialSets
      prevTargetsRef.current = targets
    }
  }, [initialSets, targets, sessionHandle, client])

  // Derive vars from curStep (always consistent by construction)
  // This ensures vars and curStep are never mismatched during layout transitions
  const vars = useMemo(() => {
    if (!curStep) return null
    return makeVars(curStep.sets as S[])
  }, [curStep])

  // Update curStep when stepIdx changes
  useEffect(() => {
    if (effectiveStepIdx === null || effectiveStepIdx >= steps.length) {
      return
    }

    const storedStep = steps[effectiveStepIdx]
    if (storedStep) {
      const feStep = shapesToStep(storedStep.shapes)
      if (feStep) {
        setCurStep(feStep)
      }
    }
  }, [effectiveStepIdx, steps, shapesToStep])

  // Initialize training session on load
  useEffect(() => {
    if (inputs.length === 0 || Object.keys(targetsMap).length === 0) return
    if (sessionHandle !== null) return // Already have a session for this layout

    // Create initial step locally for immediate display
    try {
      const wasmStep = apvd.make_step(inputs as any, targetsMap)
      const error = (wasmStep as { error: { v: number } }).error.v
      const shapes = extractShapes((wasmStep as { shapes: unknown[] }).shapes)

      // Store initial step
      setSteps([{ shapes, error }])
      setModelErrors([error])
      setMinStep(0)
      setMinError(error)
      setStepIdxState(0)

      // Update current inputs ref
      currentInputsRef.current = inputs

      // Convert to FE Step for display
      const feStep = makeStep(wasmStep, initialSets as Set[])
      setCurStep(feStep)
    } catch (err) {
      console.error("Failed to create initial step:", err)
      return
    }

    // Create training session (maintains model state for continueTraining)
    // Pass maxSteps: 0 to prevent auto-training - we'll use continueTraining on demand
    ;(async () => {
      try {
        const handle = await client.startTraining({
          inputs,
          targets: targetsMap,
          params: {
            maxSteps: 0, // Don't auto-train, use continueTraining on demand
            learningRate,
            convergenceThreshold,
          },
        })
        setSessionHandle(handle)
        console.log("[useTrainingClient] Created training session:", handle.id)
      } catch (err) {
        console.error("Failed to create training session:", err)
      }
    })()
  }, [inputs, targetsMap, sessionHandle, initialSets, client, learningRate, convergenceThreshold])

  // Forward step - matches prod behavior:
  // - When at end of computed steps: compute batch and jump to end
  // - When behind: navigate by 1 (or n) through already-computed steps
  const fwdStep = useCallback(async (n?: number) => {
    if (stepIdx === null) return
    if (stepIdx >= maxSteps || converged) {
      setRunningState("none")
      return
    }

    // Determine navigation vs computation (prod logic)
    let advanceBy: number
    let batchSize: number
    const atEndOfComputed = stepIdx + 1 >= steps.length

    if (n === undefined) {
      // Called from animation loop or default
      advanceBy = atEndOfComputed ? stepBatchSize : 1
      batchSize = stepBatchSize
    } else {
      // Explicit step count requested
      advanceBy = n
      batchSize = Math.max(n, stepBatchSize)
    }

    const targetIdx = stepIdx + advanceBy

    // If we can navigate within existing steps, just do that
    if (targetIdx < steps.length) {
      setStepIdx(targetIdx)
      return
    }

    // Need to compute more steps
    if (!sessionHandle) {
      console.warn("[useTrainingClient] No session handle, cannot continue training")
      return
    }

    const actualBatchSize = Math.min(batchSize, maxSteps - steps.length + 1)

    if (actualBatchSize <= 0) {
      setStepIdx(steps.length - 1)
      return
    }

    setIsComputing(true)

    try {
      const result: ContinueTrainingResult = await client.continueTraining(sessionHandle, actualBatchSize)

      // Add all computed steps to local history (for sparklines and time-travel)
      const newSteps: StoredStep[] = result.steps.map(s => ({
        shapes: s.shapes,
        error: s.error,
      }))
      setSteps(prev => [...prev, ...newSteps])
      setModelErrors(prev => [...prev, ...result.steps.map(s => s.error)])

      // Update best step tracking from session
      if (result.minError < (minError ?? Infinity)) {
        setMinError(result.minError)
        setMinStep(result.minStep)
      }

      // Jump to end of new batch (like prod does)
      const newTotalSteps = steps.length + newSteps.length
      setStepIdx(newTotalSteps - 1)
    } catch (err) {
      console.error("Failed to continue training:", err)
    } finally {
      setIsComputing(false)
    }
  }, [stepIdx, steps.length, maxSteps, stepBatchSize, converged, sessionHandle, client, minError, setStepIdx])

  // Reverse step
  const revStep = useCallback((n: number = 1) => {
    if (stepIdx === null) return
    const newIdx = Math.max(stepIdx - n, 0)
    setStepIdx(newIdx)
  }, [stepIdx, setStepIdx])

  // Navigation constraints
  const cantAdvance = useMemo(
    () => stepIdx === null || stepIdx >= maxSteps || converged || isComputing,
    [stepIdx, maxSteps, converged, isComputing]
  )

  const cantReverse = useMemo(
    () => stepIdx === null || stepIdx <= 0,
    [stepIdx]
  )

  // Build tiered keyframes from steps (power-of-2 indices)
  const buildKeyframes = useCallback(() => {
    const keyframes: TraceExport["keyframes"] = []
    for (let i = 0; i < steps.length; i++) {
      // Include step 0, 1, 2, 4, 8, 16, ... (powers of 2 and their neighbors)
      if (i === 0 || i === 1 || (i > 1 && (i & (i - 1)) === 0)) {
        keyframes.push({
          stepIndex: i,
          error: steps[i].error,
          shapes: steps[i].shapes,
        })
      }
    }
    // Always include the last step if not already included
    const lastIdx = steps.length - 1
    if (lastIdx > 0 && keyframes[keyframes.length - 1]?.stepIndex !== lastIdx) {
      keyframes.push({
        stepIndex: lastIdx,
        error: steps[lastIdx].error,
        shapes: steps[lastIdx].shapes,
      })
    }
    return keyframes
  }, [steps])

  // Export trace data
  const exportTrace = useCallback((): TraceExport | null => {
    if (steps.length === 0 || minStep === null || minError === null) {
      return null
    }

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      inputs: currentInputsRef.current,
      targets: targetsMap,
      params: {
        learningRate,
        convergenceThreshold,
      },
      totalSteps: steps.length,
      minStep,
      minError,
      keyframes: buildKeyframes(),
      errors: modelErrors,
    }
  }, [steps, minStep, minError, targetsMap, learningRate, convergenceThreshold, buildKeyframes, modelErrors])

  // Download trace as JSON file
  const downloadTrace = useCallback(() => {
    const trace = exportTrace()
    if (!trace) {
      console.warn("No trace data to export")
      return
    }

    const json = JSON.stringify(trace, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `apvd-trace-${trace.totalSteps}steps-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`Exported trace: ${trace.totalSteps} steps, ${trace.keyframes.length} keyframes, ${(json.length / 1024).toFixed(1)}KB`)
  }, [exportTrace])

  return {
    stepIdx: effectiveStepIdx,
    setStepIdx,
    vStepIdx,
    setVStepIdx,
    curStep,
    minStep,
    minError,
    fwdStep,
    revStep,
    cantAdvance,
    cantReverse,
    runningState,
    setRunningState,
    totalSteps,
    vars,
    converged,
    modelErrors,
    isComputing,
    exportTrace,
    downloadTrace,
  }
}
