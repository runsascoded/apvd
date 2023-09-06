import {R2, Shape} from "apvd";

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
