import css from "../App.module.scss";
import {Model, Step} from "../lib/regions";
import {Sparklines, SparklinesLine} from "react-sparklines";
import {max, min, abs} from "../lib/math";
import React, {useMemo} from "react";

/** Sparkline cell that takes pre-computed array of values (for Worker-based training) */
export function ArraySparkLineCell(
    { data, color, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, className = '', }: {
        data: number[]
        color: string
        className?: string
    } & SparkLineProps
) {
    // Take most recent sparkLineLimit values, pad with first value if needed
    let displayData = data.slice(-sparkLineLimit)
    if (displayData.length < sparkLineLimit && displayData.length > 0) {
        displayData = [...Array(sparkLineLimit - displayData.length).fill(displayData[0]), ...displayData]
    }
    if (displayData.length === 0) {
        return <td className={className} style={{ width: sparkLineWidth, height: sparkLineHeight }}></td>
    }
    return <td className={className}>
        <Sparklines
            data={displayData}
            limit={sparkLineLimit}
            width={40} height={20}
            svgWidth={sparkLineWidth} svgHeight={sparkLineHeight}
            margin={sparkLineMargin}
        >
            <SparklinesLine
                color={color}
                style={{strokeWidth: sparkLineStrokeWidth,}}
            />
        </Sparklines>
    </td>
}

export const SparkNum = (v: number | null | undefined, className: string = '') =>
    <td className={`${css.sparkNum} ${className}`}>
        <span>{v === null || v === undefined ? '' : v.toPrecision(4)}</span>
    </td>

export function SparkLineCell(
    { color, fn, model, stepIdx, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, className = '', }: {
        color: string
        fn: (step: Step) => number | null
        model: Model
        stepIdx: number
        className?: string
    } & SparkLineProps
) {
    let data =
        model
            .steps
            .slice(
                max(0, stepIdx - sparkLineLimit),
                stepIdx + 1
            )
            .map(fn)
            .filter(v => v !== null) as number[]
    if (data.length < sparkLineLimit) {
        data = [ ...Array(sparkLineLimit - data.length).fill(data[0]), ...data ]
    }
    return <td className={className}>
        <Sparklines
            data={data}
            limit={sparkLineLimit}
            width={40} height={20}
            svgWidth={sparkLineWidth} svgHeight={sparkLineHeight}
            margin={sparkLineMargin}
        >
            <SparklinesLine
                color={color}
                style={{strokeWidth: sparkLineStrokeWidth,}}
                // onMouseMove={(e, v, { x, y }) => {
                //     console.log("sparkline mousemove:", e, v, x, y)
                // }}
            />
        </Sparklines>
    </td>
}

export type SparkLineProps = {
    showSparkLines: boolean
    sparkLineLimit: number
    sparkLineStrokeWidth: number
    sparkLineMargin: number
    sparkLineWidth: number
    sparkLineHeight: number
    sparklineColors: { red: string; green: string; blue: string }
}
export type SparkLineCellProps = SparkLineProps & {
    model: Model
    stepIdx: number
}

/**
 * Bi-color sparkline that shows positive values in red (above centerline)
 * and negative values in blue (below centerline), with filled areas.
 *
 * X-axis position is dynamic:
 * - All negative: x-axis at top
 * - All positive: x-axis at bottom
 * - Mixed: x-axis positioned proportionally
 */
export function BiColorSparkline(
    { data, width, height, margin = 2, strokeWidth = 1, positiveColor = '#dc3545', negativeColor = '#2196f3' }: {
        data: number[]
        width: number
        height: number
        margin?: number
        strokeWidth?: number
        positiveColor?: string
        negativeColor?: string
    }
) {
    const { points, zeroY } = useMemo(() => {
        if (data.length === 0) return { points: [], zeroY: height / 2 }

        const minVal = data.reduce((m, v) => min(m, v), data[0])
        const maxVal = data.reduce((m, v) => max(m, v), data[0])
        const innerHeight = height - margin * 2
        const innerWidth = width - margin * 2

        // Determine zero line position based on data range
        let zeroY: number
        if (maxVal <= 0) {
            // All negative or zero: x-axis at top
            zeroY = margin
        } else if (minVal >= 0) {
            // All positive or zero: x-axis at bottom
            zeroY = height - margin
        } else {
            // Mixed: position proportionally
            const range = maxVal - minVal
            zeroY = margin + (maxVal / range) * innerHeight
        }

        // Map data to points
        const range = max(maxVal - minVal, 1e-10)
        const points = data.map((v, i) => ({
            x: margin + (i / (data.length - 1 || 1)) * innerWidth,
            y: margin + ((maxVal - v) / range) * innerHeight,
            value: v,
        }))

        return { points, zeroY }
    }, [data, width, height, margin])

    if (points.length === 0) {
        return <svg width={width} height={height} />
    }

    // Build paths for positive and negative fills
    const positivePath = useMemo(() => {
        if (points.length < 2) return ''
        let d = `M ${points[0].x} ${zeroY}`
        for (const p of points) {
            const clampedY = min(p.y, zeroY) // Only above centerline
            d += ` L ${p.x} ${clampedY}`
        }
        d += ` L ${points[points.length - 1].x} ${zeroY} Z`
        return d
    }, [points, zeroY])

    const negativePath = useMemo(() => {
        if (points.length < 2) return ''
        let d = `M ${points[0].x} ${zeroY}`
        for (const p of points) {
            const clampedY = max(p.y, zeroY) // Only below centerline
            d += ` L ${p.x} ${clampedY}`
        }
        d += ` L ${points[points.length - 1].x} ${zeroY} Z`
        return d
    }, [points, zeroY])

    // Build line segments that change color at zero crossings
    const lineSegments = useMemo(() => {
        if (points.length < 2) return []

        const segments: { path: string; color: string }[] = []
        let currentPath = `M ${points[0].x} ${points[0].y}`
        let currentColor = points[0].value >= 0 ? positiveColor : negativeColor

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1]
            const curr = points[i]
            const prevPositive = prev.value >= 0
            const currPositive = curr.value >= 0

            if (prevPositive !== currPositive) {
                // Zero crossing - find intersection point and split
                const t = prev.value / (prev.value - curr.value) // interpolation factor
                const crossX = prev.x + t * (curr.x - prev.x)
                const crossY = zeroY // crossing happens at zero line

                // Finish current segment at crossing
                currentPath += ` L ${crossX} ${crossY}`
                segments.push({ path: currentPath, color: currentColor })

                // Start new segment from crossing
                currentColor = currPositive ? positiveColor : negativeColor
                currentPath = `M ${crossX} ${crossY}`
            }

            currentPath += ` L ${curr.x} ${curr.y}`
        }

        // Push final segment
        segments.push({ path: currentPath, color: currentColor })

        return segments
    }, [points, zeroY, positiveColor, negativeColor])

    return (
        <svg width={width} height={height}>
            {/* Positive fill (red, above zero) */}
            <path d={positivePath} fill={positiveColor} fillOpacity={0.3} />
            {/* Negative fill (blue, below zero) */}
            <path d={negativePath} fill={negativeColor} fillOpacity={0.3} />
            {/* Zero line */}
            <line
                x1={margin} y1={zeroY}
                x2={width - margin} y2={zeroY}
                stroke="#999" strokeWidth={0.5} strokeDasharray="2,2"
            />
            {/* Data line segments - color changes at zero crossings */}
            {lineSegments.map((seg, i) => (
                <path
                    key={i}
                    d={seg.path}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                />
            ))}
        </svg>
    )
}

/** Bi-color sparkline cell for region error history */
export function BiColorSparkLineCell(
    { data, sparkLineLimit, sparkLineWidth, sparkLineHeight, sparkLineMargin, sparkLineStrokeWidth, sparklineColors, className = '' }: {
        data: number[]
        className?: string
    } & SparkLineProps
) {
    // Take most recent sparkLineLimit values, pad with first value if needed
    let displayData = data.slice(-sparkLineLimit)
    if (displayData.length < sparkLineLimit && displayData.length > 0) {
        displayData = [...Array(sparkLineLimit - displayData.length).fill(displayData[0]), ...displayData]
    }
    if (displayData.length === 0) {
        return <td className={className} style={{ width: sparkLineWidth, height: sparkLineHeight }}></td>
    }
    return (
        <td className={className}>
            <BiColorSparkline
                data={displayData}
                width={sparkLineWidth}
                height={sparkLineHeight}
                margin={sparkLineMargin}
                strokeWidth={sparkLineStrokeWidth}
                positiveColor={sparklineColors.red}
                negativeColor={sparklineColors.blue}
            />
        </td>
    )
}
