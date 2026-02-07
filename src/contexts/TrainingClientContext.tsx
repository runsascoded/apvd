/**
 * TrainingClientContext - Context for sharing the TrainingClient instance.
 *
 * In production: Uses Worker for non-blocking training
 * In development: Falls back to main thread (blocks UI but works with Vite dev server)
 */

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react"
import * as apvd from "@apvd/wasm"
import type {
  TrainingClient as BaseTrainingClient,
  TrainingRequest,
  TrainingHandle,
  ProgressUpdate,
  StepState,
  StepStateWithGeometry,
  TraceInfo,
  Unsubscribe,
  InputSpec,
  TargetsMap,
  Shape,
  BatchTrainingRequest,
  BatchTrainingResult,
  BatchStep,
  ContinueTrainingResult,
  SparklineData,
} from "@apvd/client"
import { WorkerTrainingClient, extractShapes } from "@apvd/worker"

// Check if we're in development mode
const isDev = import.meta.env.DEV

// Extended TrainingClient with session-based and batch APIs
export interface TrainingClient extends BaseTrainingClient {
  trainBatch(request: BatchTrainingRequest): Promise<BatchTrainingResult>
  /** Continue training an existing session for more steps */
  continueTraining(handle: TrainingHandle, numSteps: number): Promise<ContinueTrainingResult>
}

// Re-export types used by downstream hooks/components
export type { ContinueTrainingResult, SparklineData, BatchTrainingRequest, BatchStep, BatchTrainingResult }

/**
 * Creates a TrainingClient that runs on the main thread (for dev mode).
 * This blocks the UI during training but works with Vite's dev server.
 */
function createMainThreadClient(): TrainingClient {
  const progressCallbacks = new Set<(update: ProgressUpdate) => void>()

  // Training session state
  interface Session {
    id: string
    inputs: InputSpec[]
    targets: TargetsMap
    params: TrainingRequest["params"]
    currentStep: number
    totalSteps: number
    minError: number
    minStep: number
    startTime: number
    stopped: boolean
    history: Array<{ stepIndex: number; error: number; shapes: Shape[] }>
    btdSteps: number[]
    currentWasmStep: unknown
  }

  const sessions = new Map<string, Session>()
  let sessionCounter = 0

  function sendProgress(
    session: Session,
    type: "progress" | "complete" | "error",
    errorMessage?: string,
  ): void {
    const shapes = session.currentWasmStep
      ? extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes)
      : []

    const update: ProgressUpdate = {
      handleId: session.id,
      type,
      currentStep: session.currentStep,
      totalSteps: session.totalSteps,
      error: session.currentWasmStep
        ? (session.currentWasmStep as { error: { v: number } }).error.v
        : Infinity,
      minError: session.minError,
      minStep: session.minStep,
      shapes,
      elapsedMs: Date.now() - session.startTime,
      ...(errorMessage && { errorMessage }),
    }

    progressCallbacks.forEach(cb => cb(update))
  }

  return {
    async createModel(inputs: InputSpec[], targets: TargetsMap): Promise<StepStateWithGeometry> {
      const wasmStep = apvd.make_step(inputs as any, targets)
      return {
        stepIndex: 0,
        isKeyframe: true,
        shapes: extractShapes((wasmStep as { shapes: unknown[] }).shapes),
        error: (wasmStep as { error: { v: number } }).error.v,
        targets,
        inputs,
      } as unknown as StepStateWithGeometry
    },

    async startTraining(request: TrainingRequest): Promise<TrainingHandle> {
      const id = `session-${++sessionCounter}`
      const params = request.params ?? {}
      const maxSteps = params.maxSteps ?? 10000
      const learningRate = params.learningRate ?? 0.5
      const convergenceThreshold = params.convergenceThreshold ?? 1e-10
      const progressInterval = params.progressInterval ?? 100

      const session: Session = {
        id,
        inputs: request.inputs,
        targets: request.targets,
        params,
        currentStep: 0,
        totalSteps: maxSteps,
        minError: Infinity,
        minStep: 0,
        startTime: Date.now(),
        stopped: false,
        history: [],
        btdSteps: [],
        currentWasmStep: null,
      }
      sessions.set(id, session)

      // Create initial step
      session.currentWasmStep = apvd.make_step(request.inputs as any, request.targets)
      let currentError = (session.currentWasmStep as { error: { v: number } }).error.v
      session.minError = currentError

      // Store initial step
      session.history.push({
        stepIndex: 0,
        error: currentError,
        shapes: extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes),
      })
      session.btdSteps.push(0)

      // Send initial progress
      sendProgress(session, "progress")

      // Run training loop asynchronously
      ;(async () => {
        for (let step = 1; step <= maxSteps && !session.stopped; step++) {
          // Error-scaled stepping: step_size = current_error * learningRate
          const prevError = (session.currentWasmStep as { error: { v: number } }).error.v
          const scaledStepSize = prevError * learningRate
          session.currentWasmStep = apvd.step(session.currentWasmStep, scaledStepSize)
          session.currentStep = step
          currentError = (session.currentWasmStep as { error: { v: number } }).error.v

          if (currentError < session.minError) {
            session.minError = currentError
            session.minStep = step
            session.btdSteps.push(step)
          }

          // Store keyframes periodically
          if (step % 1024 === 0 || step === maxSteps) {
            session.history.push({
              stepIndex: step,
              error: currentError,
              shapes: extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes),
            })
          }

          if (step % progressInterval === 0 || step === maxSteps) {
            sendProgress(session, "progress")
          }

          if (currentError < convergenceThreshold) {
            break
          }

          // Yield to event loop periodically
          if (step % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }

        sendProgress(session, "complete")
      })()

      return { id, startedAt: session.startTime }
    },

    async stopTraining(handle: TrainingHandle): Promise<void> {
      const session = sessions.get(handle.id)
      if (session) {
        session.stopped = true
      }
    },

    async getStep(handle: TrainingHandle, stepIndex: number): Promise<StepState> {
      const session = sessions.get(handle.id)
      if (!session) throw new Error(`Session ${handle.id} not found`)

      const entry = session.history.find(h => h.stepIndex === stepIndex)
      if (entry) {
        return {
          stepIndex: entry.stepIndex,
          error: entry.error,
          shapes: entry.shapes,
          isKeyframe: true,
        }
      }

      throw new Error(`Step ${stepIndex} not found in history`)
    },

    async getStepWithGeometry(handle: TrainingHandle, stepIndex: number): Promise<StepStateWithGeometry> {
      const session = sessions.get(handle.id)
      if (!session) throw new Error(`Session ${handle.id} not found`)

      // Find nearest keyframe
      let nearestEntry = session.history[0]
      for (const entry of session.history) {
        if (entry.stepIndex <= stepIndex && entry.stepIndex > nearestEntry.stepIndex) {
          nearestEntry = entry
        }
      }

      // Recompute from keyframe if needed
      let shapes = nearestEntry.shapes
      let error = nearestEntry.error

      if (nearestEntry.stepIndex < stepIndex) {
        let wasmStep = apvd.make_step(
          shapes.map(s => [s, Array(s.kind === "Circle" ? 3 : s.kind === "XYRR" ? 4 : 5).fill(true)]) as any,
          session.targets
        )
        const learningRate = session.params?.learningRate ?? 0.5
        for (let i = nearestEntry.stepIndex; i < stepIndex; i++) {
          // Error-scaled stepping
          const prevError = (wasmStep as { error: { v: number } }).error.v
          const scaledStepSize = prevError * learningRate
          wasmStep = apvd.step(wasmStep, scaledStepSize)
        }
        shapes = extractShapes((wasmStep as { shapes: unknown[] }).shapes)
        error = (wasmStep as { error: { v: number } }).error.v
      }

      return {
        stepIndex,
        isKeyframe: nearestEntry.stepIndex === stepIndex,
        shapes,
        error,
        targets: session.targets,
        inputs: session.inputs,
      } as unknown as StepStateWithGeometry
    },

    async getTraceInfo(handle: TrainingHandle): Promise<TraceInfo> {
      const session = sessions.get(handle.id)
      if (!session) throw new Error(`Session ${handle.id} not found`)

      return {
        totalSteps: session.currentStep,
        btdSteps: session.btdSteps,
      }
    },

    async trainBatch(request: BatchTrainingRequest): Promise<BatchTrainingResult> {
      const { inputs, targets, numSteps, learningRate = 0.5 } = request

      // Create initial step
      let wasmStep = apvd.make_step(inputs as any, targets)
      const steps: BatchStep[] = [{
        stepIndex: 0,
        error: (wasmStep as { error: { v: number } }).error.v,
        shapes: extractShapes((wasmStep as { shapes: unknown[] }).shapes),
      }]

      let minError = steps[0].error
      let minStepIndex = 0

      // Sparkline data tracking
      const sparklineGradients: number[][] = []
      const sparklineRegionErrors: Record<string, number[]> = {}

      // Extract initial gradients and region errors
      const initialStep = wasmStep as {
        error: { v: number; d?: number[] }
        errors: Map<string, { error: { v: number } }> | Record<string, { error: { v: number } }>
      }
      sparklineGradients.push(initialStep.error.d || [])
      const initialErrors = initialStep.errors
      if (initialErrors) {
        const errorEntries = initialErrors instanceof Map ? initialErrors.entries() : Object.entries(initialErrors)
        for (const [regionKey, regionErr] of errorEntries) {
          if (!sparklineRegionErrors[regionKey]) {
            sparklineRegionErrors[regionKey] = []
          }
          sparklineRegionErrors[regionKey].push((regionErr as { error: { v: number } }).error.v)
        }
      }

      // Compute remaining steps with error-scaled stepping
      for (let i = 1; i < numSteps; i++) {
        const prevError = (wasmStep as { error: { v: number } }).error.v
        const scaledStepSize = prevError * learningRate
        wasmStep = apvd.step(wasmStep, scaledStepSize)
        const error = (wasmStep as { error: { v: number } }).error.v
        const shapes = extractShapes((wasmStep as { shapes: unknown[] }).shapes)

        steps.push({ stepIndex: i, error, shapes })

        if (error < minError) {
          minError = error
          minStepIndex = i
        }

        // Extract sparkline data
        const stepData = wasmStep as {
          error: { v: number; d?: number[] }
          errors: Map<string, { error: { v: number } }> | Record<string, { error: { v: number } }>
        }
        sparklineGradients.push(stepData.error.d || [])
        const stepErrors = stepData.errors
        if (stepErrors) {
          const errorEntries = stepErrors instanceof Map ? stepErrors.entries() : Object.entries(stepErrors)
          for (const [regionKey, regionErr] of errorEntries) {
            if (!sparklineRegionErrors[regionKey]) {
              sparklineRegionErrors[regionKey] = []
            }
            while (sparklineRegionErrors[regionKey].length < i) {
              sparklineRegionErrors[regionKey].push(0)
            }
            sparklineRegionErrors[regionKey].push((regionErr as { error: { v: number } }).error.v)
          }
        }

        // Yield periodically for responsiveness
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      return {
        steps,
        minError,
        minStepIndex,
        finalShapes: steps[steps.length - 1].shapes,
        sparklineData: {
          errors: steps.map(s => s.error),
          gradients: sparklineGradients,
          regionErrors: sparklineRegionErrors,
        },
      }
    },

    async continueTraining(handle: TrainingHandle, numSteps: number): Promise<ContinueTrainingResult> {
      const session = sessions.get(handle.id)
      if (!session) throw new Error(`Session ${handle.id} not found`)

      const learningRate = session.params?.learningRate ?? 0.5
      const startStep = session.currentStep

      // Create a seed model from the last step
      const lastStep = session.currentWasmStep
      const batchSeed = {
        steps: [lastStep],
        repeat_idx: null,
        min_idx: 0,
        min_error: (lastStep as { error: { v: number } }).error.v,
      }

      // Call train() to compute the batch
      const trainedModel = apvd.train(batchSeed, learningRate, numSteps)
      const modelSteps = (trainedModel as { steps: unknown[] }).steps
      const batchMinIdx = (trainedModel as { min_idx: number }).min_idx
      const batchMinError = (trainedModel as { min_error: number }).min_error

      // Collect per-step data (skip first step as it duplicates last)
      const batchSteps: Array<{ stepIndex: number; error: number; shapes: Shape[] }> = []

      // Sparkline data tracking
      const sparklineGradients: number[][] = []
      const sparklineRegionErrors: Record<string, number[]> = {}

      for (let i = 1; i < modelSteps.length; i++) {
        const wasmStep = modelSteps[i] as {
          error: { v: number; d?: number[] }
          shapes: unknown[]
          errors: Map<string, { error: { v: number } }> | Record<string, { error: { v: number } }>
        }
        const stepIndex = startStep + i
        const error = wasmStep.error.v
        const shapes = extractShapes(wasmStep.shapes)

        batchSteps.push({ stepIndex, error, shapes })

        sparklineGradients.push(wasmStep.error.d || [])
        const stepErrors = wasmStep.errors
        if (stepErrors) {
          const errorEntries = stepErrors instanceof Map ? stepErrors.entries() : Object.entries(stepErrors)
          for (const [regionKey, regionErr] of errorEntries) {
            if (!sparklineRegionErrors[regionKey]) {
              sparklineRegionErrors[regionKey] = []
            }
            while (sparklineRegionErrors[regionKey].length < i - 1) {
              sparklineRegionErrors[regionKey].push(0)
            }
            sparklineRegionErrors[regionKey].push((regionErr as { error: { v: number } }).error.v)
          }
        }

        // Store keyframes periodically in session history
        if (stepIndex % 1024 === 0) {
          session.history.push({ stepIndex, error, shapes })
        }
      }

      // Update session state with final step
      const finalStep = modelSteps[modelSteps.length - 1]
      session.currentWasmStep = finalStep
      session.currentStep = startStep + modelSteps.length - 1

      // Update best step tracking
      const absoluteBatchMinStep = startStep + batchMinIdx
      if (batchMinError < session.minError) {
        session.minError = batchMinError
        session.minStep = absoluteBatchMinStep
        session.btdSteps.push(absoluteBatchMinStep)
      }

      const currentError = (finalStep as { error: { v: number } }).error.v
      const currentShapes = extractShapes((finalStep as { shapes: unknown[] }).shapes)

      return {
        totalSteps: session.currentStep,
        currentStep: session.currentStep,
        minError: session.minError,
        minStep: session.minStep,
        currentShapes,
        currentError,
        steps: batchSteps,
        sparklineData: {
          errors: batchSteps.map(s => s.error),
          gradients: sparklineGradients,
          regionErrors: sparklineRegionErrors,
        },
      }
    },

    onProgress(callback: (update: ProgressUpdate) => void): Unsubscribe {
      progressCallbacks.add(callback)
      return () => progressCallbacks.delete(callback)
    },

    disconnect(): void {
      sessions.clear()
      progressCallbacks.clear()
    },

    // Trace persistence stubs (OPFS support planned - see specs/trace-persistence.md)
    async loadTrace(): Promise<never> {
      throw new Error("loadTrace not implemented in static FE - use uploadTrace() for file import")
    },
    async loadSavedTrace(): Promise<never> {
      throw new Error("loadSavedTrace not implemented - OPFS persistence planned")
    },
    async saveTrace(): Promise<never> {
      throw new Error("saveTrace not implemented - OPFS persistence planned")
    },
    async listTraces(): Promise<never> {
      throw new Error("listTraces not implemented - OPFS persistence planned")
    },
    async renameTrace(): Promise<never> {
      throw new Error("renameTrace not implemented - OPFS persistence planned")
    },
    async deleteTrace(): Promise<never> {
      throw new Error("deleteTrace not implemented - OPFS persistence planned")
    },
    async listSampleTraces(): Promise<never> {
      throw new Error("listSampleTraces not implemented in static FE")
    },
    async loadSampleTrace(): Promise<never> {
      throw new Error("loadSampleTrace not implemented in static FE")
    },
  }
}

interface TrainingClientContextValue {
  client: TrainingClient
}

const TrainingClientContext = createContext<TrainingClientContextValue | null>(null)

export function TrainingClientProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<TrainingClient | null>(null)

  // Create client lazily
  const client = useMemo(() => {
    if (!clientRef.current) {
      if (isDev) {
        // Development: use main thread client (works with Vite dev server)
        console.log("[TrainingClient] Using main thread client (dev mode)")
        clientRef.current = createMainThreadClient()
      } else {
        // Production: use Worker client from @apvd/worker
        console.log("[TrainingClient] Using Worker client (production mode)")
        import("../workers/training.worker?worker").then(({ default: TrainingWorker }) => {
          const worker = new TrainingWorker()
          clientRef.current = new WorkerTrainingClient(worker) as unknown as TrainingClient
        })
        // Return main thread client initially, will be replaced when Worker loads
        clientRef.current = createMainThreadClient()
      }
    }
    return clientRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [])

  const value = useMemo(() => ({ client }), [client])

  return (
    <TrainingClientContext.Provider value={value}>
      {children}
    </TrainingClientContext.Provider>
  )
}

export function useTrainingClient(): TrainingClient {
  const context = useContext(TrainingClientContext)
  if (!context) {
    throw new Error("useTrainingClient must be used within a TrainingClientProvider")
  }
  return context.client
}
