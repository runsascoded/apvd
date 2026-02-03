import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { TraceStats } from '../hooks/useTrainingClient'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export type TraceStatsDisplayProps = {
  traceStats: TraceStats | null
}

export function TraceStatsDisplay({ traceStats }: TraceStatsDisplayProps) {
  if (!traceStats) return null

  const { totalSteps, keyframeCount, compressionRatio, errorsBytes, keyframesBytes, totalBytes, bucketSize } = traceStats

  const tooltipContent = (
    <div style={{ textAlign: 'left', fontSize: '0.9em' }}>
      <div><strong>Trace Storage</strong></div>
      <div style={{ marginTop: '4px' }}>
        <div>Steps: {totalSteps.toLocaleString()}</div>
        <div>Keyframes: {keyframeCount.toLocaleString()}</div>
        <div>Compression: {compressionRatio.toFixed(1)}× ({(100 / compressionRatio).toFixed(1)}%)</div>
      </div>
      <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '4px' }}>
        <div>Errors array: ~{formatBytes(errorsBytes)}</div>
        <div>Keyframes: ~{formatBytes(keyframesBytes)}</div>
        <div><strong>Total: ~{formatBytes(totalBytes)}</strong></div>
      </div>
      <div style={{ marginTop: '4px', opacity: 0.7, fontSize: '0.85em' }}>
        Bucket size: {bucketSize}
      </div>
    </div>
  )

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>{tooltipContent}</Tooltip>}
    >
      <span style={{ cursor: 'help', opacity: 0.7, marginLeft: '0.5em' }}>
        💾 {keyframeCount} kf (~{formatBytes(totalBytes)})
      </span>
    </OverlayTrigger>
  )
}
