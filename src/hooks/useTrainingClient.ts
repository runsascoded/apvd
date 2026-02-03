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
import pako from "pako"
import { useTrainingClient, ContinueTrainingResult } from "../contexts/TrainingClientContext"
import { S, mapShape, Set } from "../lib/shape"
import { Targets } from "../lib/targets"
import { makeStep, Step } from "../lib/regions"
import { CircleCoords, Coord, getPolygonCoords, makeVars, Vars, XYRRCoords, XYRRTCoords } from "../lib/vars"
import { RunningState } from "../types"
import { buildTemplateValues, generateFilename, DEFAULT_TEMPLATE } from "../lib/trace-filename"

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
  /** Template for trace download filename. See lib/trace-filename.ts for available variables. */
  traceFilenameTemplate?: string
}

// Training performance metrics
export interface TrainingMetrics {
  // Rolling average of recent batches
  stepsPerSecond: number
  // Last batch timing
  lastBatchSteps: number
  lastBatchDurationMs: number
  // Total stats
  totalSteps: number
  totalDurationMs: number
  // Training start time
  trainingStartTime: number | null
}

// Trace storage statistics
export interface TraceStats {
  totalSteps: number
  keyframeCount: number
  compressionRatio: number
  // Estimated storage sizes in bytes
  errorsBytes: number
  keyframesBytes: number
  totalBytes: number
  // Bucket size used for tiering
  bucketSize: number
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
  /** History of best steps for error plot visualization */
  bestStepHistory: { step: number, error: number }[]

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

  // Sparkline data: per-region error history (regionKey -> array of error values)
  regionErrorHistory: Record<string, number[]>

  // Loading state
  isComputing: boolean

  // Performance metrics
  trainingMetrics: TrainingMetrics | null

  // Export/import
  exportTrace: () => TraceExport | null
  downloadTrace: () => void
  /** Upload and import a trace file (.json or .json.gz) */
  uploadTrace: () => void

  // Trace storage statistics
  traceStats: TraceStats | null
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

// V2 trace format (CLI output) - uses btd/interval keyframes instead of dense errors
export interface TraceExportV2 {
  version: 2
  created: string
  config: {
    inputs: InputSpec[]
    targets: TargetsMap
    learningRate: number
    convergenceThreshold: number
  }
  // Best-to-date keyframes (steps where error improved)
  btdKeyframes: Array<{
    stepIndex: number
    shapes: Shape[]
    error: number | null
  }>
  // Interval keyframes (evenly-spaced for reconstruction)
  intervalKeyframes: Array<{
    stepIndex: number
    shapes: Shape[]
    error: number | null
  }>
  totalSteps: number
  minError: number
  minStep: number
}

// HMR state preservation
interface HmrData {
  steps: StoredStep[]
  modelErrors: number[]
  regionErrorHistory: Record<string, number[]>
  minStep: number | null
  minError: number | null
  bestStepHistory: { step: number, error: number }[]
  stepIdx: number | null
  trainingMetrics: TrainingMetrics | null
}

// Get HMR-preserved data if available
function getHmrData(): HmrData | null {
  if (import.meta.hot?.data?.trainingState) {
    return import.meta.hot.data.trainingState as HmrData
  }
  return null
}

export function useTrainingClientHook(options: UseTrainingClientOptions): UseTrainingClientResult {
  const {
    initialSets,
    targets,
    maxSteps,
    stepBatchSize,
    learningRate,
    convergenceThreshold,
    traceFilenameTemplate = DEFAULT_TEMPLATE,
  } = options

  const client = useTrainingClient()

  // Get HMR-preserved state (only on initial mount)
  const hmrData = useMemo(() => getHmrData(), [])

  // Session handle (for session-based training)
  // Note: session is lost on HMR since Worker may be recreated, but we preserve computed steps
  const [sessionHandle, setSessionHandle] = useState<TrainingHandle | null>(null)

  // Step history (stored locally for display and sparklines)
  const [steps, setSteps] = useState<StoredStep[]>(() => hmrData?.steps ?? [])
  const [modelErrors, setModelErrors] = useState<number[]>(() => hmrData?.modelErrors ?? [])
  // Per-region error history for sparklines (regionKey -> array of error values)
  const [regionErrorHistory, setRegionErrorHistory] = useState<Record<string, number[]>>(() => hmrData?.regionErrorHistory ?? {})

  // Best step tracking
  const [minStep, setMinStep] = useState<number | null>(() => hmrData?.minStep ?? null)
  const [minError, setMinError] = useState<number | null>(() => hmrData?.minError ?? null)
  const [bestStepHistory, setBestStepHistory] = useState<{ step: number, error: number }[]>(() => hmrData?.bestStepHistory ?? [])

  // Step navigation
  const [stepIdx, setStepIdxState] = useState<number | null>(() => hmrData?.stepIdx ?? null)
  const [vStepIdx, setVStepIdx] = useState<number | null>(null)
  const [runningState, setRunningState] = useState<RunningState>("none")

  // Current step (FE Step type for rendering)
  const [curStep, setCurStep] = useState<Step | null>(null)

  // Loading state
  const [isComputing, setIsComputing] = useState(false)

  // Training performance metrics
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics | null>(() => hmrData?.trainingMetrics ?? null)

  // Ref to track current inputs for session creation
  const currentInputsRef = useRef<InputSpec[]>([])

  // HMR: Save state before module is replaced
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.dispose((data) => {
        data.trainingState = {
          steps,
          modelErrors,
          regionErrorHistory,
          minStep,
          minError,
          bestStepHistory,
          stepIdx,
          trainingMetrics,
        } as HmrData
      })
    }
  }, [steps, modelErrors, regionErrorHistory, minStep, minError, bestStepHistory, stepIdx, trainingMetrics])

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
      setRegionErrorHistory({})
      setMinStep(null)
      setMinError(null)
      setBestStepHistory([])
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
      // Measure training time
      const batchStart = performance.now()

      const result: ContinueTrainingResult = await client.continueTraining(sessionHandle, actualBatchSize)

      const batchEnd = performance.now()
      const batchDurationMs = batchEnd - batchStart
      const batchStepsPerSec = (result.steps.length / batchDurationMs) * 1000

      // Update training metrics with exponential moving average
      setTrainingMetrics(prev => {
        const alpha = 0.3
        const prevRate = prev?.stepsPerSecond ?? batchStepsPerSec
        const newRate = alpha * batchStepsPerSec + (1 - alpha) * prevRate
        const totalStepsComputed = (prev?.totalSteps ?? 0) + result.steps.length
        // Accumulate only actual compute time (not wall-clock time including pauses)
        const totalMs = (prev?.totalDurationMs ?? 0) + batchDurationMs

        return {
          stepsPerSecond: newRate,
          lastBatchSteps: result.steps.length,
          lastBatchDurationMs: batchDurationMs,
          totalSteps: totalStepsComputed,
          totalDurationMs: totalMs,
          trainingStartTime: prev?.trainingStartTime ?? batchStart,
        }
      })

      // Add all computed steps to local history (for sparklines and time-travel)
      const newSteps: StoredStep[] = result.steps.map(s => ({
        shapes: s.shapes,
        error: s.error,
      }))
      setSteps(prev => [...prev, ...newSteps])
      setModelErrors(prev => [...prev, ...result.steps.map(s => s.error)])

      // Accumulate region error history from sparklineData
      if (result.sparklineData?.regionErrors) {
        setRegionErrorHistory(prev => {
          const updated = { ...prev }
          for (const [key, values] of Object.entries(result.sparklineData!.regionErrors)) {
            if (!updated[key]) {
              updated[key] = []
            }
            updated[key] = [...updated[key], ...values]
          }
          return updated
        })
      }

      // Update best step tracking from session
      if (result.minError < (minError ?? Infinity)) {
        setMinError(result.minError)
        setMinStep(result.minStep)
        // Track best step history for error plot visualization
        setBestStepHistory(prev => [...prev, { step: result.minStep, error: result.minError }])
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

  // Tiered keyframe helpers (match worker's bucket-based tiering)
  const BUCKET_SIZE = 1024

  const tier = useCallback((step: number): number => {
    if (step < 2 * BUCKET_SIZE) return 0
    return Math.floor(Math.log2(step / BUCKET_SIZE))
  }, [])

  const resolution = useCallback((t: number): number => {
    return Math.pow(2, t)
  }, [])

  const isKeyframe = useCallback((step: number): boolean => {
    const t = tier(step)
    const res = resolution(t)
    return step % res === 0
  }, [tier, resolution])

  // Build tiered keyframes from steps (bucket-based tiering, same as worker)
  const buildKeyframes = useCallback(() => {
    const keyframes: TraceExport["keyframes"] = []
    for (let i = 0; i < steps.length; i++) {
      if (isKeyframe(i)) {
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
  }, [steps, isKeyframe])

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
      // Round errors to 6 significant figures to reduce file size
      errors: modelErrors.map(e => Number(e.toPrecision(6))),
    }
  }, [steps, minStep, minError, targetsMap, learningRate, convergenceThreshold, buildKeyframes, modelErrors])

  // Download trace as JSON file (optionally gzipped if filename ends with .gz)
  const downloadTrace = useCallback(() => {
    const trace = exportTrace()
    if (!trace) {
      console.warn("No trace data to export")
      return
    }

    // Get shape types for template
    const shapeTypes = steps[0]?.shapes.map(s => s.kind as "Circle" | "XYRR" | "XYRRT" | "Polygon") ?? []

    // Build template values and generate filename
    const values = buildTemplateValues(trace.totalSteps, trace.minError, shapeTypes)
    const { filename, compress } = generateFilename(traceFilenameTemplate, values)

    const json = JSON.stringify(trace, null, 2)
    const jsonBytes = json.length

    // Handle compression if requested (template ends with .gz)
    let blob: Blob
    let finalFilename = filename
    let finalBytes: number
    if (compress) {
      const compressed = pako.gzip(json)
      blob = new Blob([compressed], { type: "application/gzip" })
      finalFilename = filename
      finalBytes = compressed.length
    } else {
      blob = new Blob([json], { type: "application/json" })
      finalFilename = filename
      finalBytes = jsonBytes
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    const sizeInfo = compress
      ? `${(jsonBytes / 1024).toFixed(1)}KB -> ${(finalBytes / 1024).toFixed(1)}KB (${Math.round(100 * finalBytes / jsonBytes)}%)`
      : `${(finalBytes / 1024).toFixed(1)}KB`
    console.log(`Exported trace: ${trace.totalSteps} steps, ${trace.keyframes.length} keyframes, ${sizeInfo} -> ${finalFilename}`)
  }, [exportTrace, steps, traceFilenameTemplate])

  // Upload and import a trace file (.json or .json.gz)
  const uploadTrace = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,.json.gz,.gz"

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        let jsonString: string

        if (file.name.endsWith('.gz')) {
          // Decompress gzipped file
          const arrayBuffer = await file.arrayBuffer()
          const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' })
          jsonString = decompressed
        } else {
          // Read as text
          jsonString = await file.text()
        }

        const raw = JSON.parse(jsonString)
        const version = raw.version as number

        let loadedSteps: StoredStep[] = []
        let loadedErrors: number[] = []
        let minStep: number
        let minError: number
        let totalSteps: number
        let keyframeCount: number

        if (version === 1) {
          // V1 format: TraceExport with dense errors[]
          const trace = raw as TraceExport
          loadedErrors = trace.errors
          minStep = trace.minStep
          minError = trace.minError
          totalSteps = trace.totalSteps

          // Build steps from keyframes (sparse)
          for (const kf of trace.keyframes) {
            while (loadedSteps.length <= kf.stepIndex) {
              loadedSteps.push({ shapes: [], error: 0 })
            }
            loadedSteps[kf.stepIndex] = {
              shapes: kf.shapes,
              error: kf.error,
            }
          }

          // Fill in missing steps with nearest keyframe shapes
          for (let i = 0; i < loadedErrors.length; i++) {
            if (!loadedSteps[i] || loadedSteps[i].shapes.length === 0) {
              const nearestKf = trace.keyframes.reduce((prev, curr) =>
                Math.abs(curr.stepIndex - i) < Math.abs(prev.stepIndex - i) ? curr : prev
              )
              loadedSteps[i] = {
                shapes: nearestKf.shapes,
                error: loadedErrors[i],
              }
            }
          }
          keyframeCount = trace.keyframes.length
        } else if (version === 2) {
          // V2 format: TraceExportV2 with btd/interval keyframes
          const trace = raw as TraceExportV2
          minStep = trace.minStep
          minError = trace.minError
          totalSteps = trace.totalSteps

          // Merge and sort all keyframes by stepIndex
          const allKeyframes = [...trace.btdKeyframes, ...trace.intervalKeyframes]
            .sort((a, b) => a.stepIndex - b.stepIndex)
          keyframeCount = allKeyframes.length

          // Build sparse steps from keyframes
          for (const kf of allKeyframes) {
            while (loadedSteps.length <= kf.stepIndex) {
              loadedSteps.push({ shapes: [], error: 0 })
            }
            loadedSteps[kf.stepIndex] = {
              shapes: kf.shapes,
              error: kf.error ?? 0,
            }
          }

          // Build errors array from keyframes (sparse - only keyframe errors)
          // Fill totalSteps entries, interpolating between keyframes
          for (let i = 0; i < totalSteps; i++) {
            // Find surrounding keyframes
            let prevKf = allKeyframes[0]
            let nextKf = allKeyframes[allKeyframes.length - 1]
            for (const kf of allKeyframes) {
              if (kf.stepIndex <= i) prevKf = kf
              if (kf.stepIndex >= i && kf.stepIndex < nextKf.stepIndex) {
                nextKf = kf
                break
              }
            }

            if (prevKf.stepIndex === nextKf.stepIndex || i === prevKf.stepIndex) {
              loadedErrors[i] = prevKf.error ?? 0
            } else if (i === nextKf.stepIndex) {
              loadedErrors[i] = nextKf.error ?? 0
            } else {
              // Linear interpolation between keyframes
              const t = (i - prevKf.stepIndex) / (nextKf.stepIndex - prevKf.stepIndex)
              loadedErrors[i] = (prevKf.error ?? 0) * (1 - t) + (nextKf.error ?? 0) * t
            }

            // Fill missing step shapes with nearest keyframe
            if (!loadedSteps[i] || loadedSteps[i].shapes.length === 0) {
              const nearestKf = allKeyframes.reduce((prev, curr) =>
                Math.abs(curr.stepIndex - i) < Math.abs(prev.stepIndex - i) ? curr : prev
              )
              loadedSteps[i] = {
                shapes: nearestKf.shapes,
                error: loadedErrors[i],
              }
            }
          }
        } else {
          console.error(`Unsupported trace version: ${version}`)
          return
        }

        // Update state
        setSteps(loadedSteps)
        setModelErrors(loadedErrors)
        setMinStep(minStep)
        setMinError(minError)
        setStepIdxState(0)
        setRunningState("none")

        console.log(`Imported trace v${version}: ${totalSteps} steps, ${keyframeCount} keyframes from ${file.name}`)
      } catch (err) {
        console.error("Failed to import trace:", err)
      }
    }

    input.click()
  }, [])

  // Compute trace storage statistics
  const traceStats = useMemo((): TraceStats | null => {
    if (steps.length === 0) return null

    // Count keyframes using the same logic as buildKeyframes
    let keyframeCount = 0
    for (let i = 0; i < steps.length; i++) {
      if (isKeyframe(i)) {
        keyframeCount++
      }
    }
    // Always include the last step if not already a keyframe
    const lastIdx = steps.length - 1
    if (lastIdx > 0 && !isKeyframe(lastIdx)) {
      keyframeCount++
    }

    // Estimate storage sizes
    // Errors: 8 bytes per float64, but we round to 6 sig figs so ~7 chars avg in JSON
    const errorsBytes = steps.length * 7

    // Keyframes: estimate based on shape complexity
    // Each shape has ~5-20 numbers depending on type, ~8 chars each in JSON
    const numShapes = steps[0]?.shapes.length ?? 0
    const avgCoordsPerShape = 10 // rough estimate
    const keyframeShapeBytes = numShapes * avgCoordsPerShape * 8
    const keyframesBytes = keyframeCount * (keyframeShapeBytes + 20) // +20 for stepIndex, error

    const totalBytes = errorsBytes + keyframesBytes

    return {
      totalSteps: steps.length,
      keyframeCount,
      compressionRatio: steps.length / Math.max(1, keyframeCount),
      errorsBytes,
      keyframesBytes,
      totalBytes,
      bucketSize: BUCKET_SIZE,
    }
  }, [steps, isKeyframe])

  return {
    stepIdx: effectiveStepIdx,
    setStepIdx,
    vStepIdx,
    setVStepIdx,
    curStep,
    minStep,
    minError,
    bestStepHistory,
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
    regionErrorHistory,
    isComputing,
    trainingMetrics,
    exportTrace,
    downloadTrace,
    uploadTrace,
    traceStats,
  }
}
