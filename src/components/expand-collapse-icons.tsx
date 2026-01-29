import React from "react"
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { Kbd } from 'use-kbd'
import { tooltipPopperConfig } from "./controls"

type IconProps = {
    size?: number
    className?: string
    style?: React.CSSProperties
}

/** Double chevron down - expand all */
export function ExpandAllIcon({ size = 16, className, style }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            style={style}
        >
            <path d="M3 4l5 4 5-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 8l5 4 5-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

/** Double chevron up - collapse all */
export function CollapseAllIcon({ size = 16, className, style }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            style={style}
        >
            <path d="M3 12l5-4 5 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 8l5-4 5 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

type ExpandCollapseButtonsProps = {
    expandAll: () => void
    collapseAll: () => void
    className?: string
}

export function ExpandCollapseButtons({ expandAll, collapseAll, className }: ExpandCollapseButtonsProps) {
    const buttonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        padding: '4px 6px',
        cursor: 'pointer',
        opacity: 0.7,
        transition: 'opacity 0.15s',
        color: 'inherit',
    }

    return (
        <span className={className} style={{ display: 'inline-flex', gap: '2px' }}>
            <OverlayTrigger
                overlay={
                    <Tooltip>
                        Expand all sections <Kbd action="Global:expand-all" clickable={false} />
                    </Tooltip>
                }
                popperConfig={tooltipPopperConfig}
            >
                <button
                    style={buttonStyle}
                    onClick={expandAll}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                    aria-label="Expand all sections"
                >
                    <ExpandAllIcon size={14} />
                </button>
            </OverlayTrigger>
            <OverlayTrigger
                overlay={
                    <Tooltip>
                        Collapse all sections <Kbd action="Global:collapse-all" clickable={false} />
                    </Tooltip>
                }
                popperConfig={tooltipPopperConfig}
            >
                <button
                    style={buttonStyle}
                    onClick={collapseAll}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                    aria-label="Collapse all sections"
                >
                    <CollapseAllIcon size={14} />
                </button>
            </OverlayTrigger>
        </span>
    )
}
