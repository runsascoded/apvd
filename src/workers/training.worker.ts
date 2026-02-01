/**
 * Training Worker wrapper for Vite bundling.
 *
 * This file re-exports the worker from @apvd/client so that Vite can bundle it
 * with proper dependency resolution (including apvd-wasm).
 *
 * Note: Uses dynamic import for WASM to work better with Vite's dev server.
 */

import type {
  TrainingRequest,
  ProgressUpdate,
  TrainingResult,
  TraceInfo,
  StepState,
  Shape,
  InputSpec,
  TargetsMap,
  TieredConfig,
} from "@apvd/client"

// Batch training types
interface BatchTrainingRequest {
  inputs: InputSpec[]
  targets: TargetsMap
  numSteps: number
  learningRate?: number
}

interface BatchStep {
  stepIndex: number
  error: number
  shapes: Shape[]
}

interface BatchTrainingResult {
  steps: BatchStep[]
  minError: number
  minStepIndex: number
  finalShapes: Shape[]
}

// Worker message types (internal to worker)
interface WorkerRequest {
  id: string
  type: "createModel" | "train" | "stop" | "getStep" | "getStepWithGeometry" | "getTraceInfo" | "trainBatch" | "continueTraining"
  payload: unknown
}

interface WorkerResponse {
  id: string
  type: "result" | "error" | "progress"
  payload: unknown
}

// Active training sessions
interface TrainingSession {
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
  // Step history for time-travel (keyframes only if tiered)
  history: Array<{ stepIndex: number; error: number; shapes: Shape[] }>
  btdSteps: number[]
  tieredConfig?: TieredConfig
  // Current WASM step object
  currentWasmStep: unknown
}

const sessions = new Map<string, TrainingSession>()

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

// Tiered keyframe helpers
function tier(step: number, b: number): number {
  if (step < 2 * b) return 0
  return Math.floor(Math.log2(step / b))
}

function resolution(t: number): number {
  return 1 << t
}

function isKeyframe(step: number, b: number): boolean {
  const t = tier(step, b)
  const res = resolution(t)
  return step % res === 0
}

function nearestKeyframe(step: number, b: number): number {
  const t = tier(step, b)
  const res = resolution(t)
  return Math.floor(step / res) * res
}

// Initialize WASM - use dynamic import to help Vite's dev server
let wasmReady = false
let apvd: typeof import("apvd-wasm") | null = null

async function initWasm(): Promise<void> {
  if (wasmReady && apvd) return
  // Dynamic import for WASM module - works better with Vite dev server
  const wasmModule = await import("apvd-wasm")
  await wasmModule.default() // Call init function
  wasmModule.init_logs()
  apvd = wasmModule
  wasmReady = true
}

function getApvd() {
  if (!apvd) throw new Error("WASM not initialized")
  return apvd
}

// Send response to main thread
function respond(response: WorkerResponse): void {
  self.postMessage(response)
}

// Send progress update
function sendProgress(
  session: TrainingSession,
  type: "progress" | "complete" | "error",
  errorMessage?: string,
  finalResult?: TrainingResult
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
    ...(finalResult && { finalResult }),
    ...(errorMessage && { errorMessage }),
  }

  respond({ id: session.id, type: "progress", payload: update })
}

// Handle training request
async function handleTrain(id: string, request: TrainingRequest): Promise<void> {
  await initWasm()

  const params = request.params ?? {}
  const maxSteps = params.maxSteps ?? 10000
  const learningRate = params.learningRate ?? 0.5
  const convergenceThreshold = params.convergenceThreshold ?? 1e-10
  const progressInterval = params.progressInterval ?? 100
  const bucketSize = 1024 // Default tiered bucket size

  // Create session
  const session: TrainingSession = {
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
    tieredConfig: { bucketSize },
    currentWasmStep: null,
  }
  sessions.set(id, session)

  try {
    // Create initial step
    session.currentWasmStep = getApvd().make_step(request.inputs as any, request.targets)
    let currentError = (session.currentWasmStep as { error: { v: number } }).error.v
    session.minError = currentError

    // Store initial step (always a keyframe)
    session.history.push({
      stepIndex: 0,
      error: currentError,
      shapes: extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes),
    })
    session.btdSteps.push(0)

    // Send initial progress
    sendProgress(session, "progress")

    // Return handle immediately so client can start querying steps
    respond({ id, type: "result", payload: { handle: { id, startedAt: session.startTime } } })

    // Training loop (runs asynchronously after returning handle)
    for (let step = 1; step <= maxSteps && !session.stopped; step++) {
      // Error-scaled stepping: step_size = current_error * learningRate
      const prevError = (session.currentWasmStep as { error: { v: number } }).error.v
      const scaledStepSize = prevError * learningRate
      session.currentWasmStep = getApvd().step(session.currentWasmStep, scaledStepSize)
      session.currentStep = step
      currentError = (session.currentWasmStep as { error: { v: number } }).error.v

      // Track BTD (best to date)
      if (currentError < session.minError) {
        session.minError = currentError
        session.minStep = step
        session.btdSteps.push(step)
      }

      // Store keyframe if tiered storage says so
      if (isKeyframe(step, bucketSize) || step === maxSteps) {
        session.history.push({
          stepIndex: step,
          error: currentError,
          shapes: extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes),
        })
      }

      // Send progress update at intervals or on BTD improvement
      if (step % progressInterval === 0 || currentError < session.minError || step === maxSteps) {
        sendProgress(session, "progress")
      }

      // Check convergence
      if (currentError < convergenceThreshold) {
        break
      }

      // Yield to event loop periodically to allow stop messages and other requests
      if (step % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    // Training complete
    const traceInfo: TraceInfo = {
      totalSteps: session.currentStep,
      btdSteps: session.btdSteps,
      tiered: session.tieredConfig,
    }

    // Get shapes at min step (may need to retrieve from history)
    const minStepEntry =
      session.history.find((h) => h.stepIndex === session.minStep) ||
      session.history.find((h) => h.stepIndex === nearestKeyframe(session.minStep, bucketSize))
    const bestShapes = minStepEntry
      ? (minStepEntry.shapes as Shape[])
      : extractShapes((session.currentWasmStep as { shapes: unknown[] }).shapes)

    const finalResult: TrainingResult = {
      success: true,
      finalError: (session.currentWasmStep as { error: { v: number } }).error.v,
      minError: session.minError,
      minStep: session.minStep,
      totalSteps: session.currentStep,
      trainingTimeMs: Date.now() - session.startTime,
      shapes: bestShapes,
      traceInfo,
    }

    sendProgress(session, "complete", undefined, finalResult)
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    sendProgress(session, "error", errorMessage)
    // Only respond with error if we haven't already responded with handle
    // (error during initial step creation vs during training loop)
    if (!session.currentWasmStep) {
      respond({ id, type: "error", payload: { message: errorMessage } })
    }
  }
}

// Handle stop request
function handleStop(id: string, handleId: string): void {
  const session = sessions.get(handleId)
  if (session) {
    session.stopped = true
  }
  respond({ id, type: "result", payload: { stopped: true } })
}

// Handle getStep request (for time-travel)
async function handleGetStep(id: string, handleId: string, stepIndex: number): Promise<void> {
  await initWasm()

  const session = sessions.get(handleId)
  if (!session) {
    respond({ id, type: "error", payload: { message: `Session ${handleId} not found` } })
    return
  }

  const bucketSize = session.tieredConfig?.bucketSize ?? 1024

  // Check if we have this exact step in history
  const exactEntry = session.history.find((h) => h.stepIndex === stepIndex)
  if (exactEntry) {
    const state: StepState = {
      stepIndex: exactEntry.stepIndex,
      error: exactEntry.error,
      shapes: exactEntry.shapes as Shape[],
      isKeyframe: true,
    }
    respond({ id, type: "result", payload: state })
    return
  }

  // Find nearest keyframe and recompute
  const kf = nearestKeyframe(stepIndex, bucketSize)
  const keyframeEntry = session.history.find((h) => h.stepIndex === kf)

  if (!keyframeEntry) {
    respond({ id, type: "error", payload: { message: `No keyframe found for step ${stepIndex}` } })
    return
  }

  // Recompute from keyframe
  try {
    let wasmStep = getApvd().make_step(
      keyframeEntry.shapes.map((s: unknown) => [
        s,
        Array(
          (s as Shape).kind === "Circle" ? 3 : (s as Shape).kind === "XYRR" ? 4 : 5
        ).fill(true),
      ]) as any,
      session.targets
    )

    const learningRate = session.params?.learningRate ?? 0.5
    for (let i = keyframeEntry.stepIndex; i < stepIndex; i++) {
      // Error-scaled stepping
      const prevError = (wasmStep as { error: { v: number } }).error.v
      const scaledStepSize = prevError * learningRate
      wasmStep = getApvd().step(wasmStep, scaledStepSize)
    }

    const state: StepState = {
      stepIndex,
      error: (wasmStep as { error: { v: number } }).error.v,
      shapes: extractShapes((wasmStep as { shapes: unknown[] }).shapes),
      isKeyframe: false,
      recomputedFrom: kf,
    }
    respond({ id, type: "result", payload: state })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}

// Handle getTraceInfo request
function handleGetTraceInfo(id: string, handleId: string): void {
  const session = sessions.get(handleId)
  if (!session) {
    respond({ id, type: "error", payload: { message: `Session ${handleId} not found` } })
    return
  }

  const traceInfo: TraceInfo = {
    totalSteps: session.currentStep,
    btdSteps: session.btdSteps,
    tiered: session.tieredConfig,
  }
  respond({ id, type: "result", payload: traceInfo })
}

// Handle createModel request
async function handleCreateModel(
  id: string,
  inputs: InputSpec[],
  targets: TargetsMap
): Promise<void> {
  await initWasm()

  try {
    const wasmStep = getApvd().make_step(inputs as any, targets)

    // Return raw WASM step with metadata
    const result = {
      stepIndex: 0,
      isKeyframe: true,
      raw: wasmStep,
    }

    respond({ id, type: "result", payload: result })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}

// Handle getStepWithGeometry request
// Returns shapes and targets so the main thread can call make_step
// (WASM objects don't serialize properly through postMessage)
async function handleGetStepWithGeometry(
  id: string,
  handleId: string,
  stepIndex: number
): Promise<void> {
  await initWasm()

  const session = sessions.get(handleId)
  if (!session) {
    respond({ id, type: "error", payload: { message: `Session ${handleId} not found` } })
    return
  }

  const bucketSize = session.tieredConfig?.bucketSize ?? 1024

  try {
    // Find shapes for this step (from history or recompute)
    let shapes: Shape[]
    let error: number
    let isKeyframe = false
    let recomputedFrom: number | undefined

    const exactEntry = session.history.find((h) => h.stepIndex === stepIndex)
    if (exactEntry) {
      shapes = exactEntry.shapes as Shape[]
      error = exactEntry.error
      isKeyframe = true
    } else {
      // Recompute from nearest keyframe
      const kf = nearestKeyframe(stepIndex, bucketSize)
      const keyframeEntry = session.history.find((h) => h.stepIndex === kf)

      if (!keyframeEntry) {
        respond({
          id,
          type: "error",
          payload: { message: `No keyframe found for step ${stepIndex}` },
        })
        return
      }

      let wasmStep = getApvd().make_step(
        (keyframeEntry.shapes as Shape[]).map((s: Shape) => [
          s,
          Array(s.kind === "Circle" ? 3 : s.kind === "XYRR" ? 4 : 5).fill(true),
        ]) as any,
        session.targets
      )

      const learningRate = session.params?.learningRate ?? 0.5
      for (let i = keyframeEntry.stepIndex; i < stepIndex; i++) {
        // Error-scaled stepping
        const prevError = (wasmStep as { error: { v: number } }).error.v
        const scaledStepSize = prevError * learningRate
        wasmStep = getApvd().step(wasmStep, scaledStepSize)
      }

      shapes = extractShapes((wasmStep as { shapes: unknown[] }).shapes)
      error = (wasmStep as { error: { v: number } }).error.v
      recomputedFrom = kf
    }

    // Return shapes and targets so main thread can call make_step
    // (WASM Step objects don't serialize properly through postMessage)
    const result = {
      stepIndex,
      isKeyframe,
      ...(recomputedFrom !== undefined && { recomputedFrom }),
      shapes,
      error,
      targets: session.targets,
      inputs: session.inputs,
    }

    respond({ id, type: "result", payload: result })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}

// Handle trainBatch request - stateless batch computation using legacy train()
// Uses error-scaled stepping which matches main branch behavior
async function handleTrainBatch(id: string, request: BatchTrainingRequest): Promise<void> {
  await initWasm()

  const { inputs, targets, numSteps, learningRate = 0.5 } = request

  console.log(`[Worker] trainBatch: numSteps=${numSteps}, learningRate=${learningRate}, inputs.length=${inputs.length}`)
  console.log(`[Worker] inputs[0]:`, JSON.stringify(inputs[0]))
  console.log(`[Worker] targets:`, JSON.stringify(targets))

  try {
    // Create model and train with legacy error-scaled stepping
    // step_size = error * learningRate (matches main branch's train() call)
    const wasmModel = getApvd().make_model(inputs as any, targets)
    console.log(`[Worker] wasmModel created, steps:`, (wasmModel as any).steps?.length)

    const trainedModel = getApvd().train(wasmModel, learningRate, numSteps)
    console.log(`[Worker] training complete`)

    // Extract steps from trained model
    const modelSteps = (trainedModel as { steps: unknown[] }).steps
    const minIdx = (trainedModel as { min_idx: number }).min_idx
    const minError = (trainedModel as { min_error: number }).min_error

    console.log(`[Worker] modelSteps.length=${modelSteps.length}, minIdx=${minIdx}, minError=${minError}`)

    // Log first few step errors
    for (let i = 0; i < Math.min(5, modelSteps.length); i++) {
      const step = modelSteps[i] as { error: { v: number } }
      console.log(`[Worker] step ${i} error: ${step.error.v}`)
    }

    const steps: BatchStep[] = modelSteps.map((wasmStep: unknown, i: number) => ({
      stepIndex: i,
      error: (wasmStep as { error: { v: number } }).error.v,
      shapes: extractShapes((wasmStep as { shapes: unknown[] }).shapes),
    }))

    const result: BatchTrainingResult = {
      steps,
      minError,
      minStepIndex: minIdx,
      finalShapes: steps[steps.length - 1].shapes,
    }

    respond({ id, type: "result", payload: result })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}

// Handle continueTraining request - continue a session for more steps
// Uses train() like prod does - creates a seed model from last step and trains from there
async function handleContinueTraining(id: string, handleId: string, numSteps: number): Promise<void> {
  await initWasm()

  const session = sessions.get(handleId)
  if (!session) {
    respond({ id, type: "error", payload: { message: `Session ${handleId} not found` } })
    return
  }

  const learningRate = session.params?.learningRate ?? 0.5
  const bucketSize = session.tieredConfig?.bucketSize ?? 1024
  const startStep = session.currentStep

  try {
    // Create a seed model from the last step (like prod does)
    const lastStep = session.currentWasmStep
    const batchSeed = {
      steps: [lastStep],
      repeat_idx: null,
      min_idx: 0,
      min_error: (lastStep as { error: { v: number } }).error.v,
    }

    // Call train() to compute the batch - this handles error-scaled stepping correctly
    const trainedModel = getApvd().train(batchSeed, learningRate, numSteps)
    const modelSteps = (trainedModel as { steps: unknown[] }).steps
    const batchMinIdx = (trainedModel as { min_idx: number }).min_idx
    const batchMinError = (trainedModel as { min_error: number }).min_error

    // Collect per-step data for return (skip first step as it duplicates last)
    const batchSteps: Array<{ stepIndex: number; error: number; shapes: Shape[] }> = []

    for (let i = 1; i < modelSteps.length; i++) {
      const wasmStep = modelSteps[i]
      const stepIndex = startStep + i
      const error = (wasmStep as { error: { v: number } }).error.v
      const shapes = extractShapes((wasmStep as { shapes: unknown[] }).shapes)

      batchSteps.push({ stepIndex, error, shapes })

      // Store keyframe in session history if tiered storage says so
      if (isKeyframe(stepIndex, bucketSize)) {
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

    const result = {
      totalSteps: session.currentStep,
      currentStep: session.currentStep,
      minError: session.minError,
      minStep: session.minStep,
      currentShapes,
      currentError,
      steps: batchSteps,
    }

    respond({ id, type: "result", payload: result })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data

  try {
    switch (type) {
      case "createModel": {
        const { inputs, targets } = payload as { inputs: InputSpec[]; targets: TargetsMap }
        await handleCreateModel(id, inputs, targets)
        break
      }
      case "train":
        await handleTrain(id, payload as TrainingRequest)
        break
      case "stop": {
        const { handleId } = payload as { handleId: string }
        handleStop(id, handleId)
        break
      }
      case "getStep": {
        const { handleId, stepIndex } = payload as { handleId: string; stepIndex: number }
        await handleGetStep(id, handleId, stepIndex)
        break
      }
      case "getStepWithGeometry": {
        const { handleId, stepIndex } = payload as { handleId: string; stepIndex: number }
        await handleGetStepWithGeometry(id, handleId, stepIndex)
        break
      }
      case "getTraceInfo": {
        const { handleId } = payload as { handleId: string }
        handleGetTraceInfo(id, handleId)
        break
      }
      case "trainBatch": {
        await handleTrainBatch(id, payload as BatchTrainingRequest)
        break
      }
      case "continueTraining": {
        const { handleId, numSteps } = payload as { handleId: string; numSteps: number }
        await handleContinueTraining(id, handleId, numSteps)
        break
      }
      default:
        respond({ id, type: "error", payload: { message: `Unknown request type: ${type}` } })
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    respond({ id, type: "error", payload: { message: errorMessage } })
  }
}
