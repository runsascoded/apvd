/**
 * TraceManager - UI for managing saved traces in OPFS, with sample trace loading.
 */

import { useState, useEffect, useCallback } from "react"
import { OverlayTrigger, Tooltip, Modal, Button } from "react-bootstrap"
import { traceStorage, TraceMeta, TraceStorage, TraceData } from "../lib/trace-storage"
import css from "../App.module.scss"

/** Summary of a sample trace from the manifest */
interface SampleTraceSummary {
  filename: string
  name: string
  totalSteps: number
  minError: number
  minStep: number
  numShapes: number
  sizeBytes: number
}

/** Base URL for sample traces (configurable via env var, defaults to /apvd/samples) */
const SAMPLES_BASE_URL = import.meta.env.VITE_SAMPLES_URL ?? `${import.meta.env.BASE_URL}samples`

export interface TraceManagerProps {
  onLoad: (traceId: string) => Promise<void>
  onSave: (name?: string) => Promise<void>
  hasUnsavedChanges: boolean
  totalSteps: number
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatError(error: number): string {
  if (error < 0.001) return error.toExponential(2)
  return error.toPrecision(3)
}

function ShapeIcons({ shapeTypes }: { shapeTypes: string[] }) {
  const icons: Record<string, string> = {
    Circle: "○",
    XYRR: "⬭",
    XYRRT: "⬭",
  }
  return (
    <span style={{ fontFamily: "monospace", letterSpacing: "2px" }}>
      {shapeTypes.map((type, i) => {
        if (type.startsWith("Polygon")) {
          const n = parseInt(type.match(/\d+/)?.[0] ?? "0")
          return <span key={i} title={type}>{n > 6 ? "⬡" : "△"}</span>
        }
        return <span key={i} title={type}>{icons[type] ?? "?"}</span>
      })}
    </span>
  )
}

export function TraceManager({ onLoad, onSave, hasUnsavedChanges, totalSteps }: TraceManagerProps) {
  const [traces, setTraces] = useState<TraceMeta[]>([])
  const [sampleTraces, setSampleTraces] = useState<SampleTraceSummary[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saveName, setSaveName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  // Check OPFS support on mount
  useEffect(() => {
    setIsSupported(TraceStorage.isSupported())
  }, [])

  // Fetch sample traces manifest
  const fetchSamples = useCallback(async () => {
    try {
      const resp = await fetch(`${SAMPLES_BASE_URL}/manifest.json`)
      if (!resp.ok) return
      const samples = await resp.json() as SampleTraceSummary[]
      setSampleTraces(samples)
    } catch {
      // Samples are optional
    }
  }, [])

  // Load traces when panel opens
  const refreshTraces = useCallback(async () => {
    if (!isSupported) return
    setIsLoading(true)
    try {
      await traceStorage.init()
      const list = await traceStorage.list()
      // Sort by date, newest first
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      setTraces(list)
    } catch (err) {
      console.error("Failed to load traces:", err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  useEffect(() => {
    if (isOpen) {
      refreshTraces()
      fetchSamples()
    }
  }, [isOpen, refreshTraces, fetchSamples])

  const handleLoad = async (traceId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm("Current session has unsaved changes. Load anyway?")) {
        return
      }
    }
    setIsLoading(true)
    try {
      await onLoad(traceId)
      setIsOpen(false)
    } catch (err) {
      console.error("Failed to load trace:", err)
      alert(`Failed to load trace: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch a sample trace, save to OPFS, then load it
  const handleLoadSample = async (sample: SampleTraceSummary) => {
    if (hasUnsavedChanges) {
      if (!confirm("Current session has unsaved changes. Load anyway?")) {
        return
      }
    }
    setIsLoading(true)
    try {
      const resp = await fetch(`${SAMPLES_BASE_URL}/${sample.filename}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const trace = await resp.json() as TraceData
      // Save to OPFS so it shows up in saved traces
      const meta = await traceStorage.save(trace, sample.name)
      await refreshTraces()
      await onLoad(meta.traceId)
      setIsOpen(false)
    } catch (err) {
      console.error("Failed to load sample trace:", err)
      alert(`Failed to load sample trace: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (totalSteps === 0) {
      alert("No training data to save")
      return
    }
    setShowSaveDialog(true)
    setSaveName(`Trace ${new Date().toLocaleDateString()}`)
  }

  const confirmSave = async () => {
    setIsLoading(true)
    try {
      await onSave(saveName || undefined)
      setShowSaveDialog(false)
      await refreshTraces()
    } catch (err) {
      console.error("Failed to save trace:", err)
      alert(`Failed to save trace: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRename = async (traceId: string) => {
    if (!editName.trim()) return
    setIsLoading(true)
    try {
      await traceStorage.rename(traceId, editName.trim())
      setEditingId(null)
      await refreshTraces()
    } catch (err) {
      console.error("Failed to rename trace:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (traceId: string) => {
    setIsLoading(true)
    try {
      await traceStorage.delete(traceId)
      setConfirmDelete(null)
      await refreshTraces()
    } catch (err) {
      console.error("Failed to delete trace:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (traceId: string) => {
    try {
      await traceStorage.exportToFile(traceId)
    } catch (err) {
      console.error("Failed to export trace:", err)
      alert(`Failed to export trace: ${err}`)
    }
  }

  if (!isSupported) {
    return (
      <OverlayTrigger overlay={<Tooltip>OPFS not supported in this browser</Tooltip>}>
        <span className={css.link} style={{ opacity: 0.5, cursor: "not-allowed" }}>📁</span>
      </OverlayTrigger>
    )
  }

  return (
    <>
      <OverlayTrigger overlay={<Tooltip>Manage saved traces</Tooltip>}>
        <span className={css.link} onClick={e => { e.stopPropagation(); setIsOpen(true) }}>📁</span>
      </OverlayTrigger>

      <Modal show={isOpen} onHide={() => setIsOpen(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Saved Traces</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading && <div style={{ textAlign: "center", padding: "1em" }}>Loading...</div>}

          {/* Sample traces */}
          {sampleTraces.length > 0 && (
            <>
              <h6 className="text-muted">Sample Traces</h6>
              <table className="table table-sm table-hover mb-4">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Steps</th>
                    <th>Error</th>
                    <th>Shapes</th>
                    <th>Size</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sampleTraces.map(sample => (
                    <tr key={sample.filename}>
                      <td>{sample.name}</td>
                      <td>{sample.totalSteps.toLocaleString()}</td>
                      <td>{formatError(sample.minError)}</td>
                      <td>{sample.numShapes}</td>
                      <td style={{ fontSize: "0.85em", opacity: 0.8 }}>
                        {sample.sizeBytes < 1024 * 1024
                          ? `${(sample.sizeBytes / 1024).toFixed(0)} KB`
                          : `${(sample.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                        }
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleLoadSample(sample)}
                          disabled={isLoading}
                          title="Load this sample trace"
                        >
                          Load
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {sampleTraces.length > 0 && <h6 className="text-muted">Saved Traces</h6>}
          {!isLoading && traces.length === 0 && (
            <div style={{ textAlign: "center", padding: "2em", opacity: 0.7 }}>
              No saved traces yet. Click "Save Current" to save your training run.
            </div>
          )}

          {!isLoading && traces.length > 0 && (
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Steps</th>
                  <th>Error</th>
                  <th>Shapes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {traces.map(trace => (
                  <tr key={trace.traceId}>
                    <td>
                      {editingId === trace.traceId ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRename(trace.traceId)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          onBlur={() => handleRename(trace.traceId)}
                          autoFocus
                          style={{ width: "100%" }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingId(trace.traceId)
                            setEditName(trace.name)
                          }}
                          style={{ cursor: "pointer" }}
                          title="Click to rename"
                        >
                          {trace.name}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85em", opacity: 0.8 }}>{formatDate(trace.savedAt)}</td>
                    <td>{trace.totalSteps.toLocaleString()}</td>
                    <td>{formatError(trace.minError)}</td>
                    <td><ShapeIcons shapeTypes={trace.shapeTypes} /></td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-1"
                        onClick={() => handleLoad(trace.traceId)}
                        title="Load this trace"
                      >
                        Load
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => handleExport(trace.traceId)}
                        title="Download as file"
                      >
                        ⤓
                      </button>
                      {confirmDelete === trace.traceId ? (
                        <>
                          <button
                            className="btn btn-sm btn-danger me-1"
                            onClick={() => handleDelete(trace.traceId)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmDelete(trace.traceId)}
                          title="Delete"
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleSave} disabled={totalSteps === 0}>
            Save Current
          </Button>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Save Dialog */}
      <Modal show={showSaveDialog} onHide={() => setShowSaveDialog(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Save Trace</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label>
            Name:
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmSave()
              }}
              style={{ width: "100%", marginTop: "0.5em" }}
              autoFocus
            />
          </label>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={confirmSave} disabled={isLoading}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => setShowSaveDialog(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
