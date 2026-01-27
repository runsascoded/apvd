import React, { DetailedHTMLProps, HTMLAttributes, ReactNode, useState } from "react"
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { Placement } from "react-bootstrap/types"
import { tooltipPopperConfig } from "./controls"
import { LinkItem } from "../types"
import css from "../App.module.scss"

export function Details({ open, toggle, summary, className, children, }: {
    open: boolean
    toggle: (open: boolean) => void
    summary?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <details
            className={className || ''}
            open={open}
            onToggle={e => toggle((e.currentTarget as HTMLDetailsElement).open)}
        >
            {summary && <summary>{summary}</summary>}
            {children}
        </details>
    )
}

export function DetailsSection({ title, tooltip, open, toggle, className, children, ...rest }: {
    title: string
    tooltip?: ReactNode
    open: boolean
    toggle: (open: boolean) => void
    className?: string
    children: ReactNode
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
    return (
        <div className={css.detailsSection} {...rest}>
            <Details open={open} toggle={toggle} className={className}>
                <summary>
                    <h4 className={css.tableTitle}>{
                        tooltip
                            ? <OverlayTrigger
                                overlay={<Tooltip>{tooltip}</Tooltip>}
                                popperConfig={tooltipPopperConfig}
                            ><span>{title}</span></OverlayTrigger>
                            : title
                    }</h4>
                </summary>
                {children}
            </Details>
        </div>
    )
}

export function Links({ links, placement, }: { links: LinkItem[], placement: Placement }): [ () => void, ReactNode ] {
    const [ showTooltip, setShowTooltip ] = useState<string | null>(null)
    return [
        () => setShowTooltip(null),
        <ul style={{ listStyle: "none", }}>{
            links.map(({ name, description, children }, idx) => {
                const overlay = <Tooltip onClick={e => console.log("tooltip click:", name)}>{description}</Tooltip>
                return (
                    <li key={idx}>
                        <OverlayTrigger
                            trigger={["focus", "click"]}
                            onToggle={shown => {
                                if (shown) {
                                    console.log("showing:", name)
                                    setShowTooltip(name)
                                } else if (name == showTooltip) {
                                    console.log("hiding:", name)
                                    setShowTooltip(null)
                                }
                            }}
                            show={name == showTooltip}
                            placement={placement}
                            overlay={overlay}
                        >
                            <span
                                className={css.info}
                                style={{ opacity: name == showTooltip ? 0.5 : 1 }}
                                onClick={e => {
                                    console.log("info click:", name, name == showTooltip)
                                    e.stopPropagation()
                                }}
                            >ℹ️</span>
                        </OverlayTrigger>
                        {' '}
                        <span onClick={() => { setShowTooltip(null) }}>{children}</span>
                    </li>
                )
            })
        }</ul>
    ]
}
