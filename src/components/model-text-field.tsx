import React from 'react';
import Ellipse from "../lib/ellipse";

export type Props = {
    ellipses: Ellipse[]
    className?: string
    onChange: (value: string) => void
}
export default function ModelTextField({ ellipses, className, onChange }: Props) {
    return <textarea
        className={className || ''}
        // onKeyPress={this.onKeyPress}
        // onKeyDown={this.onKeyDown}
        onChange={e => onChange(e.target.value)}
        value={JSON.stringify(ellipses, null, 2)}
    />;
}
