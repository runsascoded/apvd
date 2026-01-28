/**
 * useTraining - Hook for model training logic.
 *
 * Encapsulates:
 * - Model initialization from initial sets and targets
 * - Forward/reverse step callbacks
 * - Running animation state and effect
 * - Step navigation constraints (cantAdvance, cantReverse)
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import * as apvd from "apvd-wasm"
import { train } from "apvd-wasm"
import { makeModel, makeStep, Model, Step } from "../lib/regions"
import { S, Set } from "../lib/shape"
import { Target, Targets } from "../lib/targets"
import { CircleCoords, Coord, getPolygonCoords, makeVars, Vars, XYRRCoords, XYRRTCoords } from "../lib/vars"
import { mapShape } from "../lib/shape"
import { max } from "../lib/math"
import { RunningState } from "../types"
import { useCompactedModel } from "./useCompactedModel"

export type UseTrainingOptions = {
  initialSets: S[]
  targets: Targets
  maxSteps: number
  stepBatchSize: number
  maxErrorRatioStepSize: number
  convergenceThreshold: number
}

export type UseTrainingResult = {
  // Model state
  model: Model | null
  setModel: (model: Model | null) => void
  vars: Vars | null

  // Step navigation
  stepIdx: number | null
  setStepIdx: (idx: number) => void
  vStepIdx: number | null
  setVStepIdx: (idx: number | null) => void
  fwdStep: (n?: number) => void
  revStep: (n?: number) => void

  // Constraints
  cantAdvance: boolean
  cantReverse: boolean

  // Running state
  runningState: RunningState
  setRunningState: (state: RunningState) => void

  // Current step (may need async loading for compacted steps)
  curStep: Step | null
  getStepFromCache: (index: number) => Step | undefined
  ensureStepLoaded: (index: number) => Promise<Step | undefined>

  // Error data for plotting
  modelErrors: number[]

  // Best step
  bestStep: Step | null

  // Compaction stats
  pagedCount: number
  opfsAvailable: boolean

  // Convergence
  converged: boolean
}

export function useTraining(options: UseTrainingOptions): UseTrainingResult {
  const { initialSets, targets, maxSteps, stepBatchSize, maxErrorRatioStepSize, convergenceThreshold } = options

  // Use compacted model with OPFS paging
  const {
    model,
    setModel,
    appendBatch,
    ensureStepLoaded,
    getStep: getStepFromCache,
    errors: modelErrors,
    pagedCount,
    opfsAvailable,
  } = useCompactedModel({ initialSets })

  // Step navigation state
  const [modelStepIdx, setModelStepIdx] = useState<number | null>(null)
  const [vStepIdx, setVStepIdx] = useState<number | null>(null)
  const [runningState, setRunningState] = useState<RunningState>("none")
  const [vars, setVars] = useState<Vars | null>(null)

  // Combined stepIdx (vStepIdx takes precedence for preview)
  const [stepIdx, setStepIdx] = useMemo(
    () => {
      return [
        vStepIdx !== null ? vStepIdx : modelStepIdx,
        (stepIdx: number) => {
          setModelStepIdx(stepIdx)
          setVStepIdx(null)
        },
      ] as const
    },
    [modelStepIdx, setModelStepIdx, vStepIdx, setVStepIdx]
  )

  // State for step loaded from OPFS
  const [loadedStep, setLoadedStep] = useState<Step | null>(null)

  // Load step from OPFS when needed
  useEffect(() => {
    if (!model || stepIdx === null) return
    if (stepIdx >= model.steps.length) return

    const inMemoryStep = model.steps[stepIdx] || getStepFromCache(stepIdx)
    if (inMemoryStep) {
      setLoadedStep(null)
      return
    }

    ensureStepLoaded(stepIdx).then(step => {
      if (step) setLoadedStep(step)
    })
  }, [model, stepIdx, getStepFromCache, ensureStepLoaded])

  // Current step
  const curStep = useMemo((): Step | null => {
    if (!model || stepIdx === null) return null
    if (stepIdx >= model.steps.length) return null
    return model.steps[stepIdx] || getStepFromCache(stepIdx) || loadedStep
  }, [model, stepIdx, getStepFromCache, loadedStep])

  // Best step (may need async loading)
  const [bestStep, setBestStep] = useState<Step | null>(null)
  useEffect(() => {
    if (!model) {
      setBestStep(null)
      return
    }

    const inMemory = model.steps[model.min_idx] || getStepFromCache(model.min_idx)
    if (inMemory) {
      setBestStep(inMemory)
      return
    }

    ensureStepLoaded(model.min_idx).then(step => {
      if (step) setBestStep(step)
    })
  }, [model, model?.min_idx, getStepFromCache, ensureStepLoaded])

  // Initialize model from initial sets and targets
  useEffect(() => {
    const vars = makeVars(initialSets)
    const { skipVars } = vars
    const inputs = initialSets.map((set: S, shapeIdx: number) => {
      const shape = set.shape
      const coords: Coord[] = mapShape<number, Coord[]>(
        shape,
        () => CircleCoords,
        () => XYRRCoords,
        () => XYRRTCoords,
        (p) => getPolygonCoords(p.vertices.length),
      )
      const wasmShape = mapShape<number, any>(
        shape,
        s => ({ kind: "Circle", c: s.c, r: s.r }),
        s => ({ kind: "XYRR", c: s.c, r: s.r }),
        s => ({ kind: "XYRRT", c: s.c, r: s.r, t: s.t }),
        p => ({ kind: "Polygon", vertices: p.vertices }),
      )
      return [
        wasmShape,
        coords.map(v => shapeIdx >= skipVars.length || !skipVars[shapeIdx].includes(v)),
      ]
    })

    const tgtList: Target[] = Array.from(targets.all)
    if (inputs.length != tgtList[0][0].length) {
      console.warn("inputs.length != tgtList[0][0].length", inputs.length, tgtList[0][0].length)
      return
    }

    const newModel = makeModel(apvd.make_model(inputs, tgtList), initialSets)
    console.log("new model:", newModel)
    setModel(newModel)
    setStepIdx(0)
    setVars(vars)
  }, [initialSets, targets.all])

  // Forward step
  const fwdStep = useCallback((n?: number) => {
    if (!model || stepIdx === null) return
    if (stepIdx >= maxSteps) {
      console.log("maxSteps reached, not running step")
      setRunningState("none")
      return
    }

    let batchSize
    if (n === undefined) {
      n = stepIdx + 1 == model.steps.length ? stepBatchSize : 1
      batchSize = stepBatchSize
    } else {
      batchSize = stepIdx + n + 1 - model.steps.length
    }

    if (stepIdx + n < model.steps.length) {
      setStepIdx(stepIdx + n)
      console.log("fwdStep: bumping stepIdx to", stepIdx + n)
      return
    }

    if (model.repeat_idx) {
      setStepIdx(model.steps.length - 1)
      console.log(`fwdStep: bumping stepIdx to ${model.steps.length - 1} due to repeat_idx ${model.repeat_idx}`)
      return
    }

    if (stepIdx + n > maxSteps) {
      n = maxSteps - stepIdx
      batchSize = n
      console.log(`fwdStep: clamping advance to ${n} steps due to maxSteps ${maxSteps}`)
    }

    // Get last raw step for training
    const lastRawStep: apvd.Step = model.raw.steps[model.raw.steps.length - 1] || (model.lastStep && {
      shapes: model.lastStep.sets.map(s => s.shape),
      components: [],
      targets: model.lastStep.targets,
      total_area: model.lastStep.total_area,
      errors: model.lastStep.errors as any,
      error: model.lastStep.error,
    })

    if (!lastRawStep) {
      console.error("No last step available for training")
      return
    }

    const batchSeed: apvd.Model = {
      steps: [lastRawStep],
      repeat_idx: null,
      min_idx: 0,
      min_error: lastRawStep.error.v,
    }

    const batch: Model = makeModel(train(batchSeed, maxErrorRatioStepSize, batchSize), initialSets)
    appendBatch(batch)

    const newLength = model.steps.length + batch.steps.length - 1
    setStepIdx(newLength - 1)
  }, [model, stepIdx, stepBatchSize, maxErrorRatioStepSize, maxSteps, initialSets, appendBatch, setStepIdx])

  // Reverse step
  const revStep = useCallback((n?: number) => {
    if (stepIdx === null) return
    const newStepIdx = max(0, stepIdx - (n || 1))
    if (stepIdx > newStepIdx) {
      console.log("reversing stepIdx to", newStepIdx)
      setStepIdx(newStepIdx)
    }
  }, [stepIdx, setStepIdx])

  // Navigation constraints
  const converged = useMemo(
    () => model !== null && model.min_error < convergenceThreshold,
    [model, convergenceThreshold]
  )

  const cantAdvance = useMemo(
    () => (model && model.repeat_idx && stepIdx == model.steps.length - 1) || stepIdx == maxSteps || converged,
    [model, stepIdx, maxSteps, converged]
  )

  const cantReverse = useMemo(() => stepIdx === 0, [stepIdx])

  return {
    model,
    setModel,
    vars,
    stepIdx,
    setStepIdx,
    vStepIdx,
    setVStepIdx,
    fwdStep,
    revStep,
    cantAdvance,
    cantReverse,
    runningState,
    setRunningState,
    curStep,
    getStepFromCache,
    ensureStepLoaded,
    modelErrors,
    bestStep,
    pagedCount,
    opfsAvailable,
    converged,
  }
}
