import {Circle, R2, Shape, XYRR} from "apvd";

export type S = Shape<number> & { idx: number, name: string, color: string }

export const getRadii = <D>(s: Shape<D>): [D, D] =>
    'Circle' in s
        ? [ s.Circle.r, s.Circle.r ]
        : [ s.XYRR.r.x, s.XYRR.r.y ]

export const getIdx = <D>(s: Shape<D>): number =>
    'Circle' in s
        ? s.Circle.idx
        : s.XYRR.idx

export const getCenter = <D>(s: Shape<D>): R2<D> =>
    'Circle' in s
        ? s.Circle.c
        : s.XYRR.c

export const shapeType = <D>(s: Shape<D>): 'Circle' | 'Ellipse' => 'Circle' in s ? 'Circle' : 'Ellipse'

export function mapShape<D, O>(
    s: Shape<D>,
    circleFn: (c: Circle<D>) => O,
    ellipseFn: (e: XYRR<D>) => O,
): O {
    return 'Circle' in s
        ? circleFn(s.Circle)
        : ellipseFn(s.XYRR)
}

export type BoundingBox<D> = [R2<D>, R2<D>]
export function shapeBox(s: Shape<number>): BoundingBox<number> {
    return mapShape(s,
        ({ c, r }) => [ { x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r } ],
        ({ c, r }) => [ { x: c.x - r.x, y: c.y - r.y }, { x: c.x + r.x, y: c.y + r.y } ],
    )
}
