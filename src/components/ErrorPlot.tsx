/**
 * ErrorPlot - Plotly chart showing training error over steps.
 *
 * Note: Hover preview is disabled due to performance issues with full re-renders.
 * The step indicator line shows the current training step position.
 */

import { lazy, Suspense, useState, useMemo, useCallback } from "react"
import css from "../App.module.scss"

const Plot = lazy(() => import("react-plotly.js"))

export type ErrorPlotProps = {
  totalSteps: number
  stepIdx: number | null
  errors: number[]
  theme: 'light' | 'dark'
  diagramBg: string
  setVStepIdx: (idx: number | null) => void
}

export function ErrorPlot({
  totalSteps,
  stepIdx,
  errors,
  theme,
  diagramBg,
}: ErrorPlotProps) {
  const [plotInitialized, setPlotInitialized] = useState(false)

  // Memoize data separately from stepIdx
  const plotData = useMemo(() => {
    if (totalSteps === 0 || errors.length === 0) return null

    return [{
      y: errors,
      type: 'scatter' as const,
      mode: 'lines' as const,
      line: { color: 'red' },
    }]
  }, [totalSteps, errors])

  // Layout with step indicator - only re-renders when stepIdx changes significantly
  const plotLayout = useMemo(() => ({
    dragmode: 'pan' as const,
    hovermode: 'x' as const,
    margin: { t: 0, l: 40, r: 0, b: 40 },
    paper_bgcolor: diagramBg,
    plot_bgcolor: diagramBg,
    font: { color: theme === 'dark' ? '#e4e4e4' : '#212529' },
    xaxis: {
      title: { text: 'Step' },
      rangemode: 'tozero' as const,
      gridcolor: theme === 'dark' ? '#3a3a5a' : '#e9ecef',
      linecolor: theme === 'dark' ? '#3a3a5a' : '#dee2e6',
    },
    yaxis: {
      title: { text: 'Error' },
      type: 'log' as const,
      fixedrange: true,
      rangemode: 'tozero' as const,
      gridcolor: theme === 'dark' ? '#3a3a5a' : '#e9ecef',
      linecolor: theme === 'dark' ? '#3a3a5a' : '#dee2e6',
    },
    shapes: [{
      type: 'line' as const,
      x0: stepIdx ?? 0,
      x1: stepIdx ?? 0,
      xref: 'x' as const,
      y0: 0,
      y1: 1,
      yref: 'paper' as const,
      line: {
        color: theme === 'dark' ? '#6a6a8a' : '#adb5bd',
        width: 1,
      },
    }]
  }), [theme, diagramBg, stepIdx])

  const handleInitialized = useCallback(() => {
    console.log("plot initialized")
    setPlotInitialized(true)
  }, [])

  if (totalSteps === 0 || !plotData) return null

  return (
    <>
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
    </>
  )
}
