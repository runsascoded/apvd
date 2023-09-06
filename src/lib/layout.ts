import {R2} from "apvd";
import * as apvd from "apvd"

export type Circle = {
    c: R2<number>
    r: number
}
export type Ellipse = {
    c: R2<number>
    r: R2<number>
}
export type Shape = Circle | Ellipse

export const toShape = (s: Shape, idx: number): apvd.Shape<number> => {
    if (typeof s.r === 'number') {
        const { c, r } = s
        return { Circle: { idx, c, r, } }
    } else {
        const { c, r } = s
        return { XYRR: { idx, c, r, } }
    }
}

export type InitialLayout = Shape[]
