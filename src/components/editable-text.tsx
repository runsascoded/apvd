import React, { Dispatch, useState } from "react";

export function EditableText({ className, defaultValue, onChange, onFocus, onBlur }: {
    className?: string
    defaultValue: string
    onChange: ((newValue: string, setValue?: Dispatch<string>) => string | undefined) | ((newValue: string, setValue?: Dispatch<string>) => void)
    onFocus?: () => void
    onBlur?: () => void
}) {
    const [ value, setValue ] = useState<string | null>(null)
    return (
        <input
            className={className || ''}
            type={"text"}
            value={value === null ? defaultValue : value}
            onFocus={() => {
                if (onFocus) { onFocus() }
                setValue(defaultValue)
            }}
            onBlur={() => {
                if (onBlur) { onBlur() }
                setValue(null)
            }}
            onChange={e => {
                const newValue = e.target.value
                const rv = onChange(newValue, setValue)
                setValue(rv === undefined ? newValue : rv)
            }}
            onKeyDown={e => { e.stopPropagation() }}
            onKeyUp={e => { e.stopPropagation() }}
        />
    )
}
