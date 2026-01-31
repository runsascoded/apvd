/**
 * useTrainingClient - Hook for training using @apvd/client.
 *
 * This is a refactored version of useTraining that delegates step history
 * and training execution to the Worker via @apvd/client.
 *
 * Key differences from useTraining:
 * - No more OPFS paging on frontend (Worker handles tiered keyframes)
 * - Uses client.onProgress() for live updates
 * - Uses client.getStepWithGeometry() for time-travel scrubbing with full geometry
 * - Simpler state management
 *
 * The Worker returns raw WASM step data, which this hook converts to FE types
 * using makeStep() for proper object references needed by rendering.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  TrainingHandle,
  ProgressUpdate,
  Shape,
  InputSpec,
  TargetsMap,
} from "@apvd/client"
import * as apvd from "apvd-wasm"
import { useTrainingClient } from "../contexts/TrainingClientContext"
import { S, mapShape, Set } from "../lib/shape"
import { Targets } from "../lib/targets"
import { makeStep, Step } from "../lib/regions"
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
  startTraining: () => Promise<void>
  stopTraining: () => Promise<void>

  // Metadata
  totalSteps: number
  vars: Vars | null
  converged: boolean

  // Error data for plotting (accumulated from progress updates)
  modelErrors: number[]
}

// Response type from worker's getStepWithGeometry
// Returns shapes and targets so main thread can call make_step
interface StepGeometryResponse {
  stepIndex: number
  isKeyframe: boolean
  recomputedFrom?: number
  shapes: Shape[]
  error: number
  targets: TargetsMap
  inputs: InputSpec[]
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

  // Current step state (FE Step type)
  const [curStep, setCurStep] = useState<Step | null>(null)
  const [vars, setVars] = useState<Vars | null>(null)

  // Error history for plotting (accumulated from progress updates)
  const [modelErrors, setModelErrors] = useState<number[]>([])

  // Derived state
  const totalSteps = progress?.currentStep ?? 0
  const minStep = progress?.minStep ?? null
  const minError = progress?.minError ?? null

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

      // Accumulate errors for plotting
      // Add error at currentStep index (sparse array, filled on each update)
      if (update.error !== undefined && update.currentStep !== undefined) {
        setModelErrors(prev => {
          const newErrors = [...prev]
          newErrors[update.currentStep] = update.error
          return newErrors
        })
      }

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

  // Load step with geometry when stepIdx changes (for time-travel and display)
  useEffect(() => {
    if (!handle || effectiveStepIdx === null) return
    if (effectiveStepIdx > totalSteps) return
    if (inputs.length === 0) return

    // Fetch shapes from worker, then compute geometry on main thread
    client.getStepWithGeometry(handle, effectiveStepIdx).then((response) => {
      // Worker returns shapes and targets, we call make_step on main thread
      const data = response as unknown as StepGeometryResponse
      if (data.shapes && data.shapes.length === inputs.length) {
        // Build new inputs using the structure from `inputs` but with coordinate values from worker
        const stepInputs: InputSpec[] = inputs.map(([originalShape, trainable], idx) => {
          const workerShape = data.shapes[idx]
          // Create new shape with same structure as original but worker's coordinates
          let newShape: Shape
          if (workerShape.kind === "Circle") {
            newShape = {
              kind: "Circle",
              c: { x: workerShape.c.x, y: workerShape.c.y },
              r: workerShape.r as number,
            }
          } else if (workerShape.kind === "XYRR") {
            const r = workerShape.r as { x: number; y: number }
            newShape = {
              kind: "XYRR",
              c: { x: workerShape.c.x, y: workerShape.c.y },
              r: { x: r.x, y: r.y },
            }
          } else if (workerShape.kind === "XYRRT") {
            const r = workerShape.r as { x: number; y: number }
            newShape = {
              kind: "XYRRT",
              c: { x: workerShape.c.x, y: workerShape.c.y },
              r: { x: r.x, y: r.y },
              t: (workerShape as any).t,
            }
          } else {
            // Polygon
            const vertices = (workerShape as { vertices: Array<{ x: number; y: number }> }).vertices
            newShape = {
              kind: "Polygon",
              vertices: vertices.map(v => ({ x: v.x, y: v.y })),
            }
          }
          return [newShape, trainable] as InputSpec
        })
        // Call make_step on main thread to get full geometry
        const wasmStep = apvd.make_step(stepInputs as any, targetsMap)
        // Convert to FE Step type
        const feStep = makeStep(wasmStep, initialSets as Set[])
        setCurStep(feStep)
      }
    }).catch(err => {
      console.error("Failed to get step with geometry:", err)
    })
  }, [client, handle, effectiveStepIdx, totalSteps, initialSets, inputs, targetsMap])

  // Start training
  const startTraining = useCallback(async () => {
    if (inputs.length === 0) return

    setIsTraining(true)
    setRunningState("fwd")
    setProgress(null)
    setCurStep(null)
    setStepIdxState(0)
    setModelErrors([])

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

  // Initialize model on load (display initial shapes without starting training)
  useEffect(() => {
    if (inputs.length === 0 || Object.keys(targetsMap).length === 0) return
    if (curStep !== null) return // Already initialized

    try {
      // Create WASM step directly on main thread
      const wasmStep = apvd.make_step(inputs as any, targetsMap)
      // Convert to frontend Step type
      const feStep = makeStep(wasmStep, initialSets)
      setCurStep(feStep)
      setStepIdxState(0)
    } catch (err) {
      console.error("Failed to create initial model:", err)
    }
  }, [inputs, targetsMap, curStep, initialSets])

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
    curStep,
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
    modelErrors,
  }
}
