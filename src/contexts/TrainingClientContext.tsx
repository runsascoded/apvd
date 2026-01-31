/**
 * TrainingClientContext - Context for sharing the TrainingClient instance.
 *
 * In production: Uses Worker for non-blocking training
 * In development: Falls back to main thread (blocks UI but works with Vite dev server)
 */

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react"
import * as apvd from "apvd-wasm"
import type {
  TrainingClient,
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
} from "@apvd/client"

// Check if we're in development mode
const isDev = import.meta.env.DEV

// Worker message types (matching the worker's protocol)
interface WorkerRequest {
  id: string
  type: "train" | "stop" | "getStep" | "getStepWithGeometry" | "createModel" | "getTraceInfo"
  payload: unknown
}

interface WorkerResponse {
  id: string
  type: "result" | "error" | "progress"
  payload: unknown
}

/**
 * Creates a TrainingClient that wraps a Worker instance directly.
 */
function createWorkerClient(worker: Worker): TrainingClient {
  const pendingRequests = new Map<string, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }>()
  const progressCallbacks = new Set<(update: ProgressUpdate) => void>()
  let requestIdCounter = 0

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, type, payload } = event.data

    if (type === "progress") {
      const update = payload as ProgressUpdate
      progressCallbacks.forEach(cb => cb(update))
      return
    }

    const pending = pendingRequests.get(id)
    if (pending) {
      pendingRequests.delete(id)
      if (type === "error") {
        pending.reject(new Error((payload as { message: string }).message))
      } else {
        pending.resolve(payload)
      }
    }
  }

  worker.onerror = (error) => {
    console.error("Worker error:", error)
  }

  function sendRequest<T>(type: WorkerRequest["type"], payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req-${++requestIdCounter}`
      pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      worker.postMessage({ id, type, payload } as WorkerRequest)
    })
  }

  return {
    async createModel(inputs: InputSpec[], targets: TargetsMap): Promise<StepStateWithGeometry> {
      return sendRequest("createModel", { inputs, targets })
    },

    async startTraining(request: TrainingRequest): Promise<TrainingHandle> {
      const result = await sendRequest<{ handle: TrainingHandle }>("train", request)
      return result.handle
    },

    async stopTraining(handle: TrainingHandle): Promise<void> {
      await sendRequest("stop", { handleId: handle.id })
    },

    async getStep(handle: TrainingHandle, stepIndex: number): Promise<StepState> {
      return sendRequest("getStep", { handleId: handle.id, stepIndex })
    },

    async getStepWithGeometry(handle: TrainingHandle, stepIndex: number): Promise<StepStateWithGeometry> {
      return sendRequest("getStepWithGeometry", { handleId: handle.id, stepIndex })
    },

    async getTraceInfo(handle: TrainingHandle): Promise<TraceInfo> {
      return sendRequest("getTraceInfo", { handleId: handle.id })
    },

    onProgress(callback: (update: ProgressUpdate) => void): Unsubscribe {
      progressCallbacks.add(callback)
      return () => progressCallbacks.delete(callback)
    },

    disconnect(): void {
      worker.terminate()
      pendingRequests.clear()
      progressCallbacks.clear()
    },
  }
}

/**
 * Extracts plain JS coordinate values from a WASM shape.
 * WASM shapes may have Dual number wrappers like { v: number }.
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
      const learningRate = params.learningRate ?? 0.05
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
          session.currentWasmStep = apvd.step(session.currentWasmStep, learningRate)
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
        const learningRate = session.params?.learningRate ?? 0.05
        for (let i = nearestEntry.stepIndex; i < stepIndex; i++) {
          wasmStep = apvd.step(wasmStep, learningRate)
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

    onProgress(callback: (update: ProgressUpdate) => void): Unsubscribe {
      progressCallbacks.add(callback)
      return () => progressCallbacks.delete(callback)
    },

    disconnect(): void {
      sessions.clear()
      progressCallbacks.clear()
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
        // Production: use Worker client
        console.log("[TrainingClient] Using Worker client (production mode)")
        // Dynamic import to avoid dev server issues
        import("../workers/training.worker?worker").then(({ default: TrainingWorker }) => {
          const worker = new TrainingWorker()
          clientRef.current = createWorkerClient(worker)
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
