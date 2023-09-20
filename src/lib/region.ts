import {R2, Shape} from "apvd";
import {Edge, Region} from "./regions";
import {sqrt} from "./math";

export const getPointAtTheta = (shape: Shape<number>, theta: number): R2<number> => {
    if ('Circle' in shape) {
        const c = shape.Circle
        return {
            x: c.c.x + c.r * Math.cos(theta),
            y: c.c.y + c.r * Math.sin(theta),
        }
    } else {
        const e = shape.XYRR
        return {
            x: e.c.x + e.r.x * Math.cos(theta),
            y: e.c.y + e.r.y * Math.sin(theta),
        }
    }
}

export const getMidpoint = ({ set, theta0, theta1 }: Edge, f: number = 0.5) =>
    getPointAtTheta(
        set.shape,
        theta0 * (1 - f) + f * theta1,
    )

export const getEdgeLength = ({ set: { shape }, theta0, theta1 }: Edge) =>
    (
        'Circle' in shape
            ? shape.Circle.r
            : sqrt(shape.XYRR.r.x * shape.XYRR.r.y)  // TODO: this is approximate
    ) * (theta1 - theta0)

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
