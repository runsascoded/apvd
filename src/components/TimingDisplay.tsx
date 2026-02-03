import { useMemo } from "react"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
import { TrainingMetrics } from "../hooks/useTrainingClient"

interface TimingDisplayProps {
  trainingMetrics: TrainingMetrics | null
}

function formatRate(rate: number): string {
  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)}k`
  }
  return rate.toFixed(0)
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

export function TimingDisplay({ trainingMetrics }: TimingDisplayProps) {
  const tooltipContent = useMemo(() => {
    if (!trainingMetrics) return null

    const avgMsPerStep = trainingMetrics.totalSteps > 0
      ? trainingMetrics.totalDurationMs / trainingMetrics.totalSteps
      : 0

    return (
      <div style={{ textAlign: "left" }}>
        <div><strong>Training Rate:</strong> {formatRate(trainingMetrics.stepsPerSecond)} steps/sec</div>
        <hr style={{ margin: "0.3em 0" }} />
        <div><strong>Last batch:</strong></div>
        <div style={{ paddingLeft: "0.5em" }}>
          Steps: {trainingMetrics.lastBatchSteps}<br />
          Time: {formatDuration(trainingMetrics.lastBatchDurationMs)}<br />
          Rate: {formatRate((trainingMetrics.lastBatchSteps / trainingMetrics.lastBatchDurationMs) * 1000)}/s
        </div>
        <hr style={{ margin: "0.3em 0" }} />
        <div><strong>Session totals:</strong></div>
        <div style={{ paddingLeft: "0.5em" }}>
          Steps: {trainingMetrics.totalSteps.toLocaleString()}<br />
          Time: {formatDuration(trainingMetrics.totalDurationMs)}<br />
          Avg: {avgMsPerStep.toFixed(2)}ms/step
        </div>
      </div>
    )
  }, [trainingMetrics])

  // Show whenever we have metrics (not just when training)
  if (!trainingMetrics) {
    return null
  }

  const rateDisplay = `${formatRate(trainingMetrics.stepsPerSecond)} steps/s`

  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id="timing-tooltip">
          {tooltipContent}
        </Tooltip>
      }
    >
      <span
        style={{
          fontSize: "0.85em",
          opacity: 0.8,
          cursor: "help",
          marginLeft: "0.5em",
          fontFamily: "monospace",
        }}
      >
        {rateDisplay}
      </span>
    </OverlayTrigger>
  )
}
