import {R2} from "apvd";
import * as Shapes from "./shape"
import {pi2, pi4, sq3, sqrt} from "./math";
import {rotate} from "./shape";

export type Circle = {
    c: R2<number>
    r: number
}
export type Ellipse = {
    c: R2<number>
    r: R2<number>
    t?: number
}
export type Shape = Circle | Ellipse

export const toShape = (s: Shape): Shapes.Shape<number> => {
    if (typeof s.r === 'number') {
        const { c, r } = s
        return { kind: 'Circle', c, r, }
    } else {
        const { c, r, t } = s as Ellipse
        if (t === undefined) {
            return { kind: 'XYRR', c, r, }
        } else {
            return { kind: 'XYRRT', c, r, t, }
        }
    }
}

export type InitialLayout = Shape[]

export const Circles: InitialLayout = [
    { c: { x: -0.5, y:      0, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0  , y:  sq3/2, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0.5, y:      0, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0  , y: -sq3/2, }, r: { x: 1, y: 1 }, t: 0 },
]

export const Disjoint: InitialLayout = [
    { c: { x: 0, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 3, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 0, y: 3, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 3, y: 3, }, r: { x: 1, y: 1 }, t: 0, },
]
export const SymmetricCircleLattice: InitialLayout = [
    { c: { x: 0, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 1, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 1, y: 1, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 0, y: 1, }, r: { x: 1, y: 1 }, t: 0, },
    // { c: { x:   0, y: 1, }, r: { x: 2, y: 1, }, },
]

const r = 2
const r2 = r * r
const r2sq = sqrt(1 + r2)
let c0 = 1/r2sq
let c1 = r2 * c0
export const Ellipses4: InitialLayout = [
    { c: { x:   c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x: 1+c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x:   c1, y: 1+c0, }, r: { x: r, y: 1, }, },
    { c: { x:   c1, y:   c0, }, r: { x: r, y: 1, }, },
]

export const Ellipses4t: InitialLayout = [
    { c: rotate({ x:   c0, y:   c1, }, pi4), r: { x: 1, y: r, }, t: pi4, },
    { c: rotate({ x: 1+c0, y:   c1, }, pi4), r: { x: 1, y: r, }, t: pi4, },
    { c: rotate({ x:   c1, y: 1+c0, }, pi4), r: { x: r, y: 1, }, t: pi4, },
    { c: rotate({ x:   c1, y:   c0, }, pi4), r: { x: r, y: 1, }, t: pi4, },
]

export const Ellipses4t2: InitialLayout = [
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:     0 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:   pi4 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:   pi2 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t: 3*pi4 },
]

export const Repro: InitialLayout = [
    { c: { x: -1.100285308561806, y: -1.1500279763995946e-5 }, r: { x: 1.000263820108834, y: 1.0000709021402923 } },
    { c: { x: 0, y: 0, }, r: 1, },
]

export const TwoOverOne: InitialLayout = [
    { c: { x:  0. , y: 0. }, r: { x: 1., y: 3. } },
    { c: { x:  0.5, y: 1. }, r: { x: 1., y: 1. } },
    { c: { x: -0.5, y: 1. }, r: { x: 1., y: 1. } },
]
