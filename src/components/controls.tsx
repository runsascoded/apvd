import React, {DetailedHTMLProps, Dispatch, InputHTMLAttributes, ReactNode} from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import css from "../../pages/index.module.scss";

export type LabelProps = {
    label: string
    tooltip?: ReactNode
    children?: ReactNode
}
export function Label({ label, tooltip, children, }: LabelProps) {
    return (
        <label>
            {
                tooltip
                    ? <OverlayTrigger overlay={<Tooltip>{tooltip}</Tooltip>}><span>{label}</span></OverlayTrigger>
                    : label
            }:
            {children}
        </label>
    )
}
export function Number(
    { label, tooltip, value, setValue, float, children, ...props }: LabelProps & {
        value: number
        setValue: Dispatch<number>
        float?: boolean
    } & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) {
    const parse = float ? parseFloat : parseInt
    return (
        <div className={css.control}>
            <Label label={label} tooltip={tooltip}>
                <input
                    type={"number"}
                    {...props}
                    // min={0} max={1.2} step={0.1}
                    value={value}
                    onChange={(e) => setValue(parse(e.target.value))}
                    onKeyDown={e => { e.stopPropagation() }}
                />
                {children}
            </Label>
        </div>
    )
}

export function Control({ label, tooltip, children }: LabelProps & { children?: ReactNode }) {
    return (
        <div className={css.control}>
            <Label label={label} tooltip={tooltip}>{
                children
            }</Label>
        </div>
    )
}

export function Checkbox(
    { label, tooltip, checked, setChecked, }: LabelProps & {
        checked: boolean
        setChecked: Dispatch<boolean>
    }
) {
    return (
        <Control label={label} tooltip={tooltip}>
            <input
                type={"checkbox"}
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                onKeyDown={e => { e.stopPropagation() }}
            />
        </Control>
    )
}

export function Select<T extends string | number>(
    { label, tooltip, value, setValue, children, }: LabelProps & {
        value: T
        setValue: Dispatch<T>
    }
) {
    return (
        <Control label={label} tooltip={tooltip}>
            <select
                value={value}
                onChange={e => setValue(e.target.value as T)}
                onKeyDown={e => { e.stopPropagation() }}
            >
                {children}
            </select>
        </Control>
    )
}
