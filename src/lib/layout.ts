import {R2} from "apvd";
import * as Shapes from "./shape"

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
