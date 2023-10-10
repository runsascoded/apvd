import {R2} from "apvd";
import {Edge, Region} from "./regions";
import { atan2, cos, deg, sin, sqrt } from "./math";
import {getRadii, level, rotate, Shape} from "./shape";

export const getPointAtTheta = (shape: Shape<number>, theta: number): R2<number> => {
    switch (shape.kind) {
        case 'Circle': {
            const { c, r } = shape
            return {
                x: c.x + r * cos(theta),
                y: c.y + r * sin(theta),
            }
        }
        case 'XYRR': {
            const { c, r } = shape
            return {
                x: c.x + r.x * cos(theta),
                y: c.y + r.y * sin(theta),
            }
        }
        case 'XYRRT': {
            const xyrr = level(shape)
            const p = getPointAtTheta(xyrr, theta)
            return rotate(p, shape.t)
        }
    }
}

export const getPointAndDirectionAtTheta = (shape: Shape<number>, theta: number): [R2<number>, number] => {
    switch (shape.kind) {
        case 'Circle': {
            const dx = shape.r * cos(theta)
            const dy = shape.r * sin(theta)
            return [
                {
                    x: shape.c.x + dx,
                    y: shape.c.y + dy,
                },
                atan2(dx, -dy),  // == atan2(dy, dx) + PI / 2
            ]
        }
        case 'XYRR': {
            const {x: rx, y: ry} = shape.r
            const dx = rx * cos(theta)
            const dy = ry * sin(theta)
            return [
                {
                    x: shape.c.x + dx,
                    y: shape.c.y + dy,
                },
                atan2(dx * ry * ry, -dy * rx * rx),
            ]
        }
        case 'XYRRT': {
            const xyrr = level(shape)
            const [p, d] = getPointAndDirectionAtTheta(xyrr, theta)
            return [rotate(p, shape.t), d + shape.t]
        }
    }
}
export const getMidpoint = ({ set, theta0, theta1 }: Edge, f: number = 0.5) =>
    getPointAtTheta(
        set.shape,
        theta0 * (1 - f) + f * theta1,
    )

export const getEdgeLength = ({ set: { shape }, theta0, theta1 }: Edge) => {
    const [ rx, ry ] = getRadii(shape)
    return sqrt(rx * ry) * (theta1 - theta0)  // TODO: this is approximate
}

export const getRegionCenter = ({ segments }: Region, fs: number[]) => {
    fs = fs || [ 0.5 ]
    let totalWeight = 0
    const points = ([] as { point: R2<number>, weight: number }[]).concat(
        ...segments.map(({ edge }) => {
            const weight = getEdgeLength(edge)
            // const weight = 1
            return fs.map(f => {
                totalWeight += weight
                return { point: getMidpoint(edge, f), weight }
            })
        }),
    )
    return {
        x: points.map(({ point: { x }, weight }) => weight * x).reduce((a,b)=>a+b) / totalWeight,
        y: points.map(({ point: { y }, weight }) => weight * y).reduce((a,b)=>a+b) / totalWeight,
    }
}

export type TextAnchor = "start" | "middle" | "end"
export type DominantBaseline = "middle" | "auto" | "hanging"
export type LabelAttrs = {
    textAnchor: TextAnchor
    dominantBaseline: DominantBaseline
}

export function getLabelAttrs(theta: number): LabelAttrs {
    // Normal direction from label to edge of region
    const degrees = (deg(theta) + 540) % 360
    let textAnchor: TextAnchor = 'end'
    const textAnchorCutoffs: [ number, TextAnchor ][] = [
        [  67.5,    'end' ],
        [ 112.5, 'middle' ],
        [ 247.5,  'start' ],
        [ 292.5, 'middle' ],
    ]
    for (let [ k, v ] of textAnchorCutoffs) {
        if (degrees < k) {
            textAnchor = v
            break
        }
    }
    let dominantBaseline: DominantBaseline = 'middle'
    const dominantBaselineCutoffs: [ number, DominantBaseline ][] = [
        [  22.5,  'middle' ],
        [ 157.5, 'hanging' ],
        [ 202.5,  'middle' ],
        [ 337.5,    'auto' ],
    ]
    for (let [ k, v ] of dominantBaselineCutoffs) {
        if (degrees < k) {
            dominantBaseline = v
            break
        }
    }
    return { textAnchor, dominantBaseline }
}
