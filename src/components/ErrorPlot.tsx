/**
 * ErrorPlot - Plotly chart showing training error over steps.
 *
 * Uses @rdub/agg-plot for window aggregation with large datasets.
 * Note: Hover preview is disabled due to performance issues with full re-renders.
 * The step indicator line shows the current training step position.
 */

import { lazy, Suspense, useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useLinearAggregation, buildTraces, generateStepWindows, AggregationControl } from "@rdub/agg-plot"
import css from "../App.module.scss"

const Plot = lazy(() => import("react-plotly.js"))

export type ErrorPlotProps = {
  totalSteps: number
  stepIdx: number | null
  errors: number[]
  theme: 'light' | 'dark'
  diagramBg: string
  setVStepIdx: (idx: number | null) => void
  logXAxis?: boolean
  bestStepHistory?: { step: number, error: number }[]
  /** Enable aggregation for large datasets (default: true when > 1000 points) */
  enableAggregation?: boolean
  /** Show aggregation controls UI */
  showAggregationControls?: boolean
}

/** Threshold above which aggregation is automatically enabled */
const AGGREGATION_THRESHOLD = 1000

export function ErrorPlot({
  totalSteps,
  stepIdx,
  errors,
  theme,
  diagramBg,
  logXAxis = false,
  bestStepHistory = [],
  enableAggregation,
  showAggregationControls = false,
}: ErrorPlotProps) {
  const [plotInitialized, setPlotInitialized] = useState(false)
  const [containerWidth, setContainerWidth] = useState(800)
  const [fixedWindowSize, setFixedWindowSize] = useState<number | undefined>(undefined)
  const [smoothingWindowSize, setSmoothingWindowSize] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container width for responsive aggregation
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Convert errors array to data points for aggregation
  const errorData = useMemo(() => {
    return errors.map((error, i) => ({ step: i, error }))
  }, [errors])

  // For log X-axis, downsample to ~targetPoints using log-spaced indices
  const logDownsampledData = useMemo(() => {
    if (!logXAxis || errorData.length <= AGGREGATION_THRESHOLD) return null
    const targetPoints = Math.max(500, Math.min(1000, containerWidth / 2))
    const n = errorData.length
    const indices = new Set<number>([0, n - 1]) // Always include first and last
    // Generate log-spaced indices from 1 to n (avoiding log(0))
    for (let i = 0; i < targetPoints - 2; i++) {
      const t = i / (targetPoints - 3) // 0 to 1
      const logIdx = Math.exp(t * Math.log(n))
      indices.add(Math.min(n - 1, Math.floor(logIdx)))
    }
    const sortedIndices = Array.from(indices).sort((a, b) => a - b)
    return sortedIndices.map(i => errorData[i])
  }, [logXAxis, errorData, containerWidth])

  // Determine if aggregation should be used
  // Disable aggregation for log X-axis since linear-space windows look wrong on log scale
  const shouldAggregate = !logXAxis && (enableAggregation ?? (errorData.length > AGGREGATION_THRESHOLD))

  // Generate step windows based on data size
  const windows = useMemo(
    () => generateStepWindows(Math.max(1000, errorData.length)),
    [errorData.length]
  )

  // Use aggregation hook
  const {
    aggregated,
    smoothed,
    window: currentWindow,
    validWindows,
  } = useLinearAggregation({
    data: shouldAggregate ? errorData : [],
    getX: d => d.step,
    metrics: ['error'],
    getValue: d => d.error,
    containerWidth,
    windows,
    fixedWindowSize,
    smoothingWindowSize,
  })

  // Build Plotly traces
  const plotData = useMemo(() => {
    if (totalSteps === 0 || errors.length === 0) return null

    const traces: any[] = []

    if (shouldAggregate && aggregated.length > 0) {
      // Use aggregated traces from @rdub/agg-plot
      const aggTraces = buildTraces({
        data: aggregated,
        smoothed,
        traces: [{ metric: 'error', name: 'Error', color: 'red', showStddev: true }],
        xAxisType: 'linear',
      })

      // Adjust x values for log X-axis (1-indexed to avoid log(0))
      for (const trace of aggTraces) {
        if (logXAxis) {
          trace.x = trace.x.map((x: string | number | null) => typeof x === 'number' ? x + 1 : x)
        }
        traces.push(trace)
      }
    } else {
      // Use raw data (or log-downsampled for large datasets with log X-axis)
      const dataToPlot = logDownsampledData ?? errorData
      const xValues = dataToPlot.map(d => logXAxis ? d.step + 1 : d.step)
      const yValues = dataToPlot.map(d => d.error)

      traces.push({
        x: xValues,
        y: yValues,
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { color: 'red' },
        name: 'Error',
      })
    }

    return traces
  }, [totalSteps, errors, errorData, logDownsampledData, shouldAggregate, aggregated, smoothed, logXAxis])

  // Layout with step indicator and best step lines
  const plotLayout = useMemo(() => {
    // For log X-axis, adjust step indicator position (1-indexed)
    const stepIndicatorX = logXAxis ? (stepIdx ?? 0) + 1 : stepIdx ?? 0

    // Build shapes array: best step lines (behind) + step indicator (front)
    const shapes: any[] = []

    // Best step vertical lines (subtle green, above gridlines but below trace)
    // Note: Plotly shapes default to above gridlines; layer:'below' would put them under grid
    for (const best of bestStepHistory) {
      const x = logXAxis ? best.step + 1 : best.step
      shapes.push({
        type: 'line' as const,
        x0: x,
        x1: x,
        xref: 'x' as const,
        y0: 0,
        y1: 1,
        yref: 'paper' as const,
        line: {
          color: theme === 'dark' ? 'rgba(0, 180, 0, 0.3)' : 'rgba(0, 150, 0, 0.25)',
          width: 2,
        },
      })
    }

    // Current step indicator (on top)
    shapes.push({
      type: 'line' as const,
      x0: stepIndicatorX,
      x1: stepIndicatorX,
      xref: 'x' as const,
      y0: 0,
      y1: 1,
      yref: 'paper' as const,
      line: {
        color: theme === 'dark' ? '#6a6a8a' : '#adb5bd',
        width: 1,
      },
    })

    return {
      dragmode: 'pan' as const,
      hovermode: 'x' as const,
      margin: { t: 0, l: 40, r: 0, b: 40 },
      paper_bgcolor: diagramBg,
      plot_bgcolor: diagramBg,
      font: { color: theme === 'dark' ? '#e4e4e4' : '#212529' },
      showlegend: false,
      xaxis: {
        title: { text: 'Step' },
        type: logXAxis ? 'log' as const : 'linear' as const,
        rangemode: 'tozero' as const,
        gridcolor: theme === 'dark' ? '#3a3a5a' : '#ccc',
        linecolor: theme === 'dark' ? '#3a3a5a' : '#aaa',
      },
      yaxis: {
        title: { text: 'Error' },
        type: 'log' as const,
        fixedrange: true,
        rangemode: 'tozero' as const,
        gridcolor: theme === 'dark' ? '#3a3a5a' : '#ccc',
        linecolor: theme === 'dark' ? '#3a3a5a' : '#aaa',
      },
      shapes,
    }
  }, [theme, diagramBg, stepIdx, logXAxis, bestStepHistory])

  const handleInitialized = useCallback(() => {
    console.log("plot initialized")
    setPlotInitialized(true)
  }, [])

  if (totalSteps === 0 || !plotData) return null

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {showAggregationControls && shouldAggregate && (
        <AggregationControl
          window={currentWindow}
          validWindows={validWindows}
          onWindowChange={w => setFixedWindowSize(w === 'auto' ? undefined : w.size)}
          isAuto={fixedWindowSize === undefined}
          smoothingSize={smoothingWindowSize}
          onSmoothingChange={setSmoothingWindowSize}
          smoothingOptions={validWindows}
          className={css.aggregationControl}
        />
      )}
      <Suspense fallback={<div className={css.plot}>Loading plot...</div>}>
        <Plot
          className={css.plot}
          style={plotInitialized ? {} : { display: "none" }}
          data={plotData}
          layout={plotLayout}
          config={{ displayModeBar: false, responsive: true }}
          onInitialized={handleInitialized}
        />
      </Suspense>
      {!plotInitialized && (
        <div className={css.plot}>
          Loading plot...
        </div>
      )}
    </div>
  )
}
