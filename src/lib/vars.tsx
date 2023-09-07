import {Circle, Dual, XYRR} from "apvd";
import {Step} from "./regions";

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

export type Coord = CircleCoord | XYRRCoord
export type VarCoord = [ number, Coord ]
export type StepVarGetter = (step: Step, varIdx: number) => number

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
