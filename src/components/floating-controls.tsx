import React, { ReactNode } from 'react'
import css from './floating-controls.module.scss'

export type FloatingControlsProps = {
    visible: boolean
    children: ReactNode
}

export function FloatingControls({ visible, children }: FloatingControlsProps) {
    return (
        <div className={`${css.floatingControls} ${visible ? css.visible : css.hidden}`}>
            <div className={css.controlsInner}>
                {children}
            </div>
        </div>
    )
}
