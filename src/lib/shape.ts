import {R2} from "apvd";
import {abs, cos, max, sin} from "./math";

export interface Circle<D> {
    kind: 'Circle'
    c: R2<D>
    r: D
}

export interface XYRR<D> {
    kind: 'XYRR'
    c: R2<D>
    r: R2<D>
}

export interface XYRRT<D> {
    kind: 'XYRRT'
    c: R2<D>
    r: R2<D>
    t: D
}

export type Shape<D> = Circle<D> | XYRR<D> | XYRRT<D>

export type Set = {
    idx: number
    name: string
    color: string
    shape: Shape<number>
}
export type S = Set

export function rotate(p: R2<number>, theta: number): R2<number> {
    const c = cos(theta)
    const s = sin(theta)
    return {
        x: p.x * c - p.y * s,
        y: p.x * s + p.y * c,
    }
}

export function level(xyrrt: XYRRT<number>): XYRR<number> {
    const { c, r, t } = xyrrt
    const { x, y } = rotate(c, -t)
    return {
        kind: 'XYRR',
        c: { x, y },
        r,
    }
}

export const getRadii = <D>(s: Shape<D>): [D, D] => {
    switch (s.kind) {
        case 'Circle': return [s.r, s.r]
        case 'XYRR': return [s.r.x, s.r.y]
        case 'XYRRT': return [s.r.x, s.r.y]
    }
}

export function mapShape<D, O>(
    s: Shape<D>,
    circleFn: (c: Circle<D>) => O,
    xyrrFn: (e: XYRR<D>) => O,
    xyrrtFn: (e: XYRRT<D>) => O,
): O {
    switch (s.kind) {
        case 'Circle': return circleFn(s)
        case 'XYRR': return xyrrFn(s)
        case 'XYRRT': return xyrrtFn(s)
    }
}

export type BoundingBox<D> = [R2<D>, R2<D>]
export function shapeBox(s: Shape<number>): BoundingBox<number> {
    return mapShape(s,
        ({ c, r }) => [ { x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r } ],
        ({ c, r }) => [ { x: c.x - r.x, y: c.y - r.y }, { x: c.x + r.x, y: c.y + r.y } ],
        ({ c, r: { x: rx, y: ry }, t }) => {
            // This is smaller than the actual bounding box, worst case is a circle rotated 45°, where each dimension is sqrt(1/2) of the true bounding box size
            const cos = Math.cos(t)
            const sin = Math.sin(t)
            const dy = max(abs(rx * sin), abs(ry * cos))
            const dx = max(abs(rx * cos), abs(ry * sin))
            return [
                { x: c.x - dx, y: c.y - dy, },
                { x: c.x + dx, y: c.y + dy, },
            ]
        },
    )
}
