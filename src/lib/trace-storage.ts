/**
 * OPFS-based trace storage for browser-side persistence.
 *
 * Structure:
 *   /apvd/
 *     traces/
 *       trace_abc123.json.gz
 *       trace_def456.json.gz
 *     index.json
 */

import pako from "pako"
import { TraceExport, TraceExportV2 } from "../hooks/useTrainingClient"

export interface TraceMeta {
  traceId: string
  name: string
  filename: string
  savedAt: string
  totalSteps: number
  minError: number
  numShapes: number
  shapeTypes: string[]
}

interface TraceIndex {
  version: 1
  traces: TraceMeta[]
}

export type TraceData = TraceExport | TraceExportV2

function generateTraceId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function getShapeTypeLabel(shape: { kind: string; vertices?: unknown[] }): string {
  if (shape.kind === "Polygon" && shape.vertices) {
    return `Polygon(${shape.vertices.length})`
  }
  return shape.kind
}

export class TraceStorage {
  private rootDir: FileSystemDirectoryHandle | null = null
  private tracesDir: FileSystemDirectoryHandle | null = null
  private index: TraceIndex = { version: 1, traces: [] }
  private initialized = false

  /**
   * Initialize OPFS access. Must be called before other methods.
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      // Get OPFS root
      const opfsRoot = await navigator.storage.getDirectory()

      // Create /apvd/ directory
      this.rootDir = await opfsRoot.getDirectoryHandle("apvd", { create: true })

      // Create /apvd/traces/ directory
      this.tracesDir = await this.rootDir.getDirectoryHandle("traces", { create: true })

      // Load or create index
      await this.loadIndex()

      this.initialized = true
      console.log("[TraceStorage] Initialized with", this.index.traces.length, "traces")
    } catch (err) {
      console.error("[TraceStorage] Failed to initialize OPFS:", err)
      throw new Error(`OPFS initialization failed: ${err}`)
    }
  }

  private async loadIndex(): Promise<void> {
    if (!this.rootDir) throw new Error("Not initialized")

    try {
      const indexHandle = await this.rootDir.getFileHandle("index.json")
      const file = await indexHandle.getFile()
      const text = await file.text()
      this.index = JSON.parse(text) as TraceIndex
    } catch {
      // Index doesn't exist, use empty
      this.index = { version: 1, traces: [] }
      await this.saveIndex()
    }
  }

  private async saveIndex(): Promise<void> {
    if (!this.rootDir) throw new Error("Not initialized")

    const indexHandle = await this.rootDir.getFileHandle("index.json", { create: true })
    const writable = await indexHandle.createWritable()
    await writable.write(JSON.stringify(this.index, null, 2))
    await writable.close()
  }

  /**
   * List all saved traces.
   */
  async list(): Promise<TraceMeta[]> {
    if (!this.initialized) await this.init()
    return [...this.index.traces]
  }

  /**
   * Save a trace to OPFS.
   */
  async save(trace: TraceData, name?: string): Promise<TraceMeta> {
    if (!this.initialized) await this.init()
    if (!this.tracesDir) throw new Error("Not initialized")

    const traceId = generateTraceId()
    const filename = `${traceId}.json.gz`

    // Extract metadata
    const isV2 = "version" in trace && trace.version === 2
    const totalSteps = trace.totalSteps
    const minError = trace.minError
    const shapes = isV2
      ? (trace as TraceExportV2).btdKeyframes[0]?.shapes ?? []
      : (trace as TraceExport).keyframes[0]?.shapes ?? []
    const numShapes = shapes.length
    const shapeTypes = shapes.map(s => getShapeTypeLabel(s as { kind: string; vertices?: unknown[] }))

    // Compress and save trace file
    const json = JSON.stringify(trace)
    const compressed = pako.gzip(json)

    const fileHandle = await this.tracesDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(compressed)
    await writable.close()

    // Update index
    const meta: TraceMeta = {
      traceId,
      name: name ?? `Trace ${this.index.traces.length + 1}`,
      filename,
      savedAt: new Date().toISOString(),
      totalSteps,
      minError,
      numShapes,
      shapeTypes,
    }
    this.index.traces.push(meta)
    await this.saveIndex()

    console.log("[TraceStorage] Saved trace:", meta.name, `(${totalSteps} steps, ${(compressed.length / 1024).toFixed(1)} KB)`)
    return meta
  }

  /**
   * Load a trace by ID.
   */
  async load(traceId: string): Promise<TraceData> {
    if (!this.initialized) await this.init()
    if (!this.tracesDir) throw new Error("Not initialized")

    const meta = this.index.traces.find(t => t.traceId === traceId)
    if (!meta) {
      throw new Error(`Trace not found: ${traceId}`)
    }

    const fileHandle = await this.tracesDir.getFileHandle(meta.filename)
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()

    // Decompress
    const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: "string" })
    const trace = JSON.parse(decompressed) as TraceData

    console.log("[TraceStorage] Loaded trace:", meta.name)
    return trace
  }

  /**
   * Rename a trace.
   */
  async rename(traceId: string, name: string): Promise<TraceMeta> {
    if (!this.initialized) await this.init()

    const meta = this.index.traces.find(t => t.traceId === traceId)
    if (!meta) {
      throw new Error(`Trace not found: ${traceId}`)
    }

    meta.name = name
    await this.saveIndex()

    console.log("[TraceStorage] Renamed trace:", traceId, "->", name)
    return meta
  }

  /**
   * Delete a trace.
   */
  async delete(traceId: string): Promise<void> {
    if (!this.initialized) await this.init()
    if (!this.tracesDir) throw new Error("Not initialized")

    const idx = this.index.traces.findIndex(t => t.traceId === traceId)
    if (idx === -1) {
      throw new Error(`Trace not found: ${traceId}`)
    }

    const meta = this.index.traces[idx]

    // Delete file
    try {
      await this.tracesDir.removeEntry(meta.filename)
    } catch {
      console.warn("[TraceStorage] File not found during delete:", meta.filename)
    }

    // Update index
    this.index.traces.splice(idx, 1)
    await this.saveIndex()

    console.log("[TraceStorage] Deleted trace:", meta.name)
  }

  /**
   * Export a trace to file download.
   */
  async exportToFile(traceId: string): Promise<void> {
    const trace = await this.load(traceId)
    const meta = this.index.traces.find(t => t.traceId === traceId)
    if (!meta) throw new Error(`Trace not found: ${traceId}`)

    const json = JSON.stringify(trace, null, 2)
    const compressed = pako.gzip(json)
    const blob = new Blob([compressed], { type: "application/gzip" })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${meta.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.json.gz`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Check if OPFS is supported in this browser.
   */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" &&
           "storage" in navigator &&
           "getDirectory" in navigator.storage
  }
}

// Singleton instance
export const traceStorage = new TraceStorage()
