/**
 * ErrorPlot - Plotly chart showing training error over steps.
 */

import { lazy, Suspense, useState, useMemo } from "react"
import { Model } from "../lib/regions"
import { round } from "../lib/math"
import css from "../App.module.scss"

const Plot = lazy(() => import("react-plotly.js"))

export type ErrorPlotProps = {
  model: Model | null
  stepIdx: number | null
  errors: number[]
  theme: 'light' | 'dark'
  diagramBg: string
  setVStepIdx: (idx: number | null) => void
}

export function ErrorPlot({
  model,
  stepIdx,
  errors,
  theme,
  diagramBg,
  setVStepIdx,
}: ErrorPlotProps) {
  const [plotInitialized, setPlotInitialized] = useState(false)

  const plotContent = useMemo(() => {
    if (!model || stepIdx === null) return null

    // Use errors (always complete, kept in memory) instead of mapping sparse steps
    const plotErrors = errors.length > 0
      ? errors
      : model.steps.filter(Boolean).map(step => step.error.v)

    return (
      <>
        <Suspense fallback={<div className={css.plot}>Loading plot...</div>}>
          <Plot
            className={css.plot}
            style={plotInitialized ? {} : { display: "none" }}
            data={[{
              y: plotErrors,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'red' },
            }]}
            layout={{
              dragmode: 'pan',
              hovermode: 'x',
              margin: { t: 0, l: 40, r: 0, b: 40 },
              paper_bgcolor: diagramBg,
              plot_bgcolor: diagramBg,
              font: { color: theme === 'dark' ? '#e4e4e4' : '#212529' },
              xaxis: {
                title: { text: 'Step' },
                rangemode: 'tozero',
                gridcolor: theme === 'dark' ? '#3a3a5a' : '#e9ecef',
                linecolor: theme === 'dark' ? '#3a3a5a' : '#dee2e6',
              },
              yaxis: {
                title: { text: 'Error' },
                type: 'log',
                fixedrange: true,
                rangemode: 'tozero',
                gridcolor: theme === 'dark' ? '#3a3a5a' : '#e9ecef',
                linecolor: theme === 'dark' ? '#3a3a5a' : '#dee2e6',
              },
              shapes: [{
                type: 'line',
                x0: stepIdx,
                x1: stepIdx,
                xref: 'x',
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: {
                  color: theme === 'dark' ? '#6a6a8a' : '#adb5bd',
                  width: 1,
                },
              }]
            }}
            config={{ displayModeBar: false, responsive: true }}
            onInitialized={() => {
              console.log("plot initialized")
              setPlotInitialized(true)
            }}
            onRelayout={(e: any) => {
              console.log("relayout:", e)
            }}
            onHover={(e: any) => {
              const vStepIdx = round(e.xvals[0])
              setVStepIdx(vStepIdx)
            }}
          />
        </Suspense>
        {!plotInitialized && (
          <div className={css.plot}>
            Loading plot...
          </div>
        )}
      </>
    )
  }, [model, stepIdx, plotInitialized, errors, theme, diagramBg, setVStepIdx])

  return plotContent
}
