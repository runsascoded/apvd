import {getCenter, getRadii, S, shapeType} from "../../lib/shape";
import React from "react";

export type Props = {
    shapes: S[]
}

export function ShapesTable({ shapes }: Props) {
    return (
        <table>
            <thead>
            <tr>
                <th>Name</th>
                <th>x</th>
                <th>y</th>
                <th>rx</th>
                <th>ry</th>
                <th>Type</th>
            </tr>
            </thead>
            <tbody>{
                shapes.map(({ idx, name, ...shape }) => {
                    const c = getCenter(shape)
                    const [ rx, ry ] = getRadii(shape)
                    return <tr key={idx}>
                        <td style={{ textAlign: "right", }}>{name}</td>
                        <td>{c.x.toPrecision(4)}</td>
                        <td>{c.y.toPrecision(4)}</td>
                        <td>{rx.toPrecision(4)}</td>
                        <td>{ry.toPrecision(4)}</td>
                        <td>{shapeType(shape)}</td>
                    </tr>
                })
            }</tbody>
        </table>
    )
}
