import {Circle, Dual, XYRR, XYRRT} from "apvd";
import {Step} from "./regions";
import {Polygon, S} from "./shape";

export type CircleCoord = 'x' | 'y' | 'r'
export type CircleGetter<T> = (c: Circle<T>) => T
export type CircleGetters<T> = { [k in CircleCoord]: CircleGetter<T> }
export const CircleCoords: CircleCoord[] = [ 'x', 'y', 'r' ]
export function CircleGetters<T>(): CircleGetters<T> {
    return {
        'x': c => c.c.x,
        'y': c => c.c.y,
        'r': c => c.r,
    }
}
export const CircleFloatGetters = CircleGetters<number>()
export const CircleDualGetters = CircleGetters<Dual>()

export type XYRRCoord = 'x' | 'y' | 'rx' | 'ry'
export type XYRRGetter<T> = (e: XYRR<T>) => T
export type XYRRGetters<T> = { [k in XYRRCoord]: XYRRGetter<T> }
export const XYRRCoords: XYRRCoord[] = [ 'x', 'y', 'rx', 'ry', ]
export function XYRRGetters<T>(): XYRRGetters<T> {
    return {
        'x': e => e.c.x,
        'y': e => e.c.y,
        'rx': e => e.r.x,
        'ry': e => e.r.y,
    }
}
export const XYRRFloatGetters = XYRRGetters<number>()
export const XYRRDualGetters = XYRRGetters<Dual>()

export type XYRRTCoord = 'x' | 'y' | 'rx' | 'ry' | 't'
export type XYRRTGetter<T> = (e: XYRRT<T>) => T
export type XYRRTGetters<T> = { [k in XYRRTCoord]: XYRRTGetter<T> }
export const XYRRTCoords: XYRRTCoord[] = [ 'x', 'y', 'rx', 'ry', 't', ]
export function XYRRTGetters<T>(): XYRRTGetters<T> {
    return {
        'x': e => e.c.x,
        'y': e => e.c.y,
        'rx': e => e.r.x,
        'ry': e => e.r.y,
        't': e => e.t,
    }
}
export const XYRRTFloatGetters = XYRRTGetters<number>()
export const XYRRTDualGetters = XYRRTGetters<Dual>()

// Polygon coordinates are dynamic: v0.x, v0.y, v1.x, v1.y, ...
export type PolygonCoord = `v${number}.${'x' | 'y'}`

export function getPolygonCoords(numVertices: number): PolygonCoord[] {
    const coords: PolygonCoord[] = []
    for (let i = 0; i < numVertices; i++) {
        coords.push(`v${i}.x`, `v${i}.y`)
    }
    return coords
}

export function PolygonGetters<T>(numVertices: number): Record<PolygonCoord, (p: Polygon<T>) => T> {
    const getters: Record<string, (p: Polygon<T>) => T> = {}
    for (let i = 0; i < numVertices; i++) {
        getters[`v${i}.x`] = p => p.vertices[i].x
        getters[`v${i}.y`] = p => p.vertices[i].y
    }
    return getters as Record<PolygonCoord, (p: Polygon<T>) => T>
}

export type Coord = CircleCoord | XYRRCoord | XYRRTCoord | PolygonCoord
export type VarCoord = [ number, Coord ]
export type StepVarGetter = (step: Step, varIdx: number) => number | null

export type Vars = {
    allCoords: Coord[][]
    skipVars: Coord[][]
    vars: Coord[][]
    numCoords: number
    numVars: number
    numSkipVars: number
    coords: VarCoord[]
    getVal: StepVarGetter
}

export function makeVars(initialSets: S[]) {
    // Create Vars
    const allCoords: Coord[][] = initialSets.map(({shape}) => {
        switch (shape.kind) {
            case 'Circle':
                return CircleCoords
            case 'XYRR':
                return XYRRCoords
            case 'XYRRT':
                return XYRRTCoords
            case 'Polygon':
                return getPolygonCoords(shape.vertices.length)
        }
    })
    const numCoords = ([] as string[]).concat(...allCoords).length
    const skipVars: Coord[][] = [
        // Fix all coords of shapes[0], it is the unit circle centered at the origin, WLOG
        // CircleCoords,
        // XYRRCoords,
        // Fix shapes[1].y. This can be done WLOG if it's a Circle. Having the second shape be an XYRR (aligned
        // ellipse, no rotation) is effectively equivalent to it being an XYRRT (ellipse with rotation allowed),
        // but where the rotation has been factored out WLOG.
        // ['y'],
    ]
    const numSkipVars = ([] as string[]).concat(...skipVars).length
    const numVars = numCoords - numSkipVars
    const filteredCoords = allCoords.map(
        (circleVars, idx) =>
            circleVars.filter(v =>
                !(skipVars[idx] || []).includes(v)
            )
    )
    const coords: VarCoord[] = []
    filteredCoords.forEach((shapeVars, shapeIdx) => {
        shapeVars.forEach(shapeVar => {
            coords.push([shapeIdx, shapeVar])
        })
    })
    console.log(`${coords.length} coords`)

    function getVal(step: Step, varIdx: number): number | null {
        const [setIdx, coord] = coords[varIdx]
        // console.log("getVal:", setIdx, varIdx, coord)
        const {shape} = step.sets[setIdx]
        let shapeGetters, shapeCoord
        switch (shape.kind) {
            case "Circle":
                shapeGetters = CircleFloatGetters
                shapeCoord = coord as CircleCoord
                if (!(shapeCoord in shapeGetters)) {
                    console.warn(`Circle coord ${shapeCoord} not found in`, shapeGetters)
                    return null
                } else {
                    return CircleFloatGetters[coord as CircleCoord](shape)
                }
            case "XYRR":
                shapeGetters = XYRRFloatGetters
                shapeCoord = coord as XYRRCoord
                if (!(shapeCoord in shapeGetters)) {
                    console.warn(`XYRR coord ${shapeCoord} not found in`, shapeGetters)
                    return null
                } else {
                    return XYRRFloatGetters[coord as XYRRCoord](shape)
                }
            case "XYRRT":
                shapeGetters = XYRRTFloatGetters
                shapeCoord = coord as XYRRTCoord
                if (!(shapeCoord in shapeGetters)) {
                    console.warn(`XYRRT coord ${shapeCoord} not found in`, shapeGetters)
                    return null
                } else {
                    return XYRRTFloatGetters[coord as XYRRTCoord](shape)
                }
            case "Polygon": {
                const polygonGetters = PolygonGetters<number>(shape.vertices.length)
                const polygonCoord = coord as PolygonCoord
                if (!(polygonCoord in polygonGetters)) {
                    console.warn(`Polygon coord ${polygonCoord} not found`)
                    return null
                }
                return polygonGetters[polygonCoord](shape)
            }
        }
    }

    const vars: Vars = {
        allCoords,
        numCoords,
        skipVars,
        numSkipVars,
        vars: filteredCoords,
        numVars,
        coords,
        getVal,
    }

    return vars
}
