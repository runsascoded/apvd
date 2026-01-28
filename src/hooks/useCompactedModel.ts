/**
 * useCompactedModel - Model state with automatic OPFS compaction.
 *
 * This hook wraps useState<Model> and adds transparent paging:
 * - When step count exceeds threshold, pages old raw steps to OPFS
 * - Keeps error values in memory for plotting
 * - Loads steps from OPFS when needed for scrubbing
 *
 * The hook maintains the same interface as useState<Model> for easy integration.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as apvd from "apvd-wasm"
import { makeStep, Model, Step } from "../lib/regions"
import { Set } from "../lib/shape"
import { PagedArray } from "../lib/paged-array"

export type UseCompactedModelOptions = {
  /** Initial sets for step reconstruction */
  initialSets: Set[]
  /** Steps to keep in memory before compacting (default: 500) */
  compactionThreshold?: number
  /** Steps to keep in memory after compaction (default: 200) */
  keepInMemory?: number
}

type StepSummary = { error: number }

export type UseCompactedModelResult = {
  /** Current model (may have sparse steps array when compacted) */
  model: Model | null
  /** Set model (initializes or replaces) */
  setModel: (model: Model | null) => void
  /** Append a training batch to the model */
  appendBatch: (batch: Model) => void
  /** Ensure step is loaded (async, for scrubbing to old steps) */
  ensureStepLoaded: (index: number) => Promise<Step | undefined>
  /** Get step sync (returns undefined if not in memory) */
  getStep: (index: number) => Step | undefined
  /** All error values (always in memory for plotting) */
  errors: number[]
  /** Number of steps paged to OPFS */
  pagedCount: number
  /** Whether OPFS is available */
  opfsAvailable: boolean
}

export function useCompactedModel(options: UseCompactedModelOptions): UseCompactedModelResult {
  const { initialSets, compactionThreshold = 500, keepInMemory = 200 } = options

  // Core model state (with potentially sparse steps array)
  const [model, setModelInternal] = useState<Model | null>(null)

  // OPFS storage for raw steps
  const storageRef = useRef<PagedArray<apvd.Step, StepSummary> | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [opfsAvailable, setOpfsAvailable] = useState(false)

  // Processed step cache (for steps loaded from OPFS)
  const stepCacheRef = useRef<Map<number, Step>>(new Map())

  // Error values (always in memory)
  const [errors, setErrors] = useState<number[]>([])

  // Track paged count
  const [pagedCount, setPagedCount] = useState(0)

  // Initialize OPFS storage
  useEffect(() => {
    async function init() {
      const storage = new PagedArray<apvd.Step, StepSummary>({
        name: 'apvd-model-compaction',
        chunkSize: 50,
        maxCachedChunks: 10,
        extractSummary: (step) => ({ error: step.error.v }),
      })
      await storage.init()
      storageRef.current = storage
      setStorageReady(true)
      // Check if OPFS is actually available (not just fallback mode)
      setOpfsAvailable(storage['dirHandle'] !== null)
    }
    init()

    return () => {
      storageRef.current?.clear()
    }
  }, [])

  // Set model (initialize or replace)
  const setModel = useCallback((newModel: Model | null) => {
    const storage = storageRef.current

    // Clear old data (must await to avoid race with pushMany)
    stepCacheRef.current.clear()
    setPagedCount(0)

    const clearPromise = storage?.clear() ?? Promise.resolve()

    clearPromise.then(() => {
      if (!newModel) {
        setModelInternal(null)
        setErrors([])
        return
      }

      // Store raw steps in OPFS and extract errors
      if (storage && storageReady) {
        const rawSteps = newModel.raw.steps
        storage.pushMany(rawSteps).then(() => {
          setErrors(storage.getSummaries().map(s => s.error))
        })
      } else {
        // Fallback: extract errors directly
        setErrors(newModel.raw.steps.map(s => s.error.v))
      }

      setModelInternal(newModel)
    })
  }, [storageReady])

  // Append training batch
  const appendBatch = useCallback((batch: Model) => {
    setModelInternal(prevModel => {
      if (!prevModel) return batch

      const storage = storageRef.current

      // Combine steps
      const newSteps = prevModel.steps.concat(batch.steps.slice(1))
      const newRawSteps = prevModel.raw.steps.concat(batch.raw.steps.slice(1))

      // Calculate new metadata
      const batchMinStep = batch.steps[batch.min_idx]
      const [min_idx, min_error] = (batchMinStep.error.v < prevModel.min_error)
        ? [batch.min_idx + prevModel.raw.steps.length - 1, batchMinStep.error.v]
        : [prevModel.min_idx, prevModel.min_error]

      const repeat_idx = batch.repeat_idx !== null
        ? batch.repeat_idx + prevModel.raw.steps.length - 1
        : prevModel.repeat_idx

      // Store new raw steps in OPFS
      if (storage && storageReady) {
        storage.pushMany(batch.raw.steps.slice(1)).then(() => {
          setErrors(storage.getSummaries().map(s => s.error))
        })
      } else {
        setErrors(prev => [...prev, ...batch.raw.steps.slice(1).map(s => s.error.v)])
      }

      // Check if we need to compact
      let finalSteps = newSteps
      let finalRawSteps = newRawSteps

      if (opfsAvailable && newSteps.length > compactionThreshold) {
        const keepFrom = newSteps.length - keepInMemory
        // Create sparse arrays with only recent steps
        finalSteps = new Array(newSteps.length)
        finalRawSteps = new Array(newRawSteps.length)

        // Keep only recent steps in memory
        for (let i = keepFrom; i < newSteps.length; i++) {
          finalSteps[i] = newSteps[i]
          finalRawSteps[i] = newRawSteps[i]
        }

        // Update paged count
        setPagedCount(keepFrom)
        console.log(`Compacted model: paged ${keepFrom} steps to OPFS, keeping ${keepInMemory} in memory`)
      }

      const newModel: Model = {
        steps: finalSteps,
        repeat_idx,
        min_idx,
        min_error,
        lastStep: batch.lastStep,
        raw: {
          steps: finalRawSteps,
          repeat_idx,
          min_idx,
          min_error,
        },
      }

      return newModel
    })
  }, [storageReady, opfsAvailable, compactionThreshold, keepInMemory])

  // Get step sync (from model.steps or cache)
  const getStep = useCallback((index: number): Step | undefined => {
    if (!model) return undefined

    // Check model.steps first
    if (model.steps[index]) {
      return model.steps[index]
    }

    // Check cache
    return stepCacheRef.current.get(index)
  }, [model])

  // Load step from OPFS (async)
  const ensureStepLoaded = useCallback(async (index: number): Promise<Step | undefined> => {
    if (!model) return undefined

    // Already in memory?
    if (model.steps[index]) {
      return model.steps[index]
    }

    // Already in cache?
    if (stepCacheRef.current.has(index)) {
      return stepCacheRef.current.get(index)
    }

    // Load from OPFS
    const storage = storageRef.current
    if (!storage) return undefined

    const rawStep = await storage.get(index)
    if (!rawStep) return undefined

    const step = makeStep(rawStep, initialSets)
    stepCacheRef.current.set(index, step)

    // Limit cache size
    if (stepCacheRef.current.size > keepInMemory) {
      const oldestKey = stepCacheRef.current.keys().next().value
      if (oldestKey !== undefined) {
        stepCacheRef.current.delete(oldestKey)
      }
    }

    return step
  }, [model, initialSets, keepInMemory])

  return {
    model,
    setModel,
    appendBatch,
    ensureStepLoaded,
    getStep,
    errors,
    pagedCount,
    opfsAvailable,
  }
}
