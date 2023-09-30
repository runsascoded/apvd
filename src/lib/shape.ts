import {R2} from "apvd";
import {abs, ceil, cos, log2, max, sin, tau} from "./math";
import {Param} from "next-utils/params";
import {bool} from "prop-types";
import {boolean} from "zod";
import {js} from "./utils";

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

export function shapeStrRust(s: Shape<number>): string {
    switch (s.kind) {
        case 'Circle': return `Circle { c: R2 { x: ${s.c.x}, y: ${s.c.y} }, r: ${s.r} }`
        case 'XYRR': return `XYRR { c: R2 { x: ${s.c.x}, y: ${s.c.y} }, r: R2 { x: ${s.r.x}, y: ${s.r.y} } }`
        case 'XYRRT': return `XYRRT { c: R2 { x: ${s.c.x}, y: ${s.c.y} }, r: R2 { x: ${s.r.x}, y: ${s.r.y} }, t: ${s.t} }`
    }
}

export function shapeStrJS(s: Shape<number>): string {
    switch (s.kind) {
        case 'Circle': return `{ kind: "Circle", c: { x: ${s.c.x}, y: ${s.c.y} }, r: ${s.r} }`
        case 'XYRR': return `{ kind: "XYRR", c: { x: ${s.c.x}, y: ${s.c.y} }, r: { x: ${s.r.x}, y: ${s.r.y} } }`
        case 'XYRRT': return `{ kind: "XYRRT", c: { x: ${s.c.x}, y: ${s.c.y} }, r: { x: ${s.r.x}, y: ${s.r.y} }, t: ${s.t} }`
    }
}

export function shapeStrJSON(s: Shape<number>): string {
    switch (s.kind) {
        case 'Circle': return `{ "kind": "Circle", "c": { "x": ${s.c.x}, "y": ${s.c.y} }, "r": ${s.r} }`
        case 'XYRR': return `{ "kind": "XYRR", "c": { "x": ${s.c.x}, "y": ${s.c.y} }, "r": { "x": ${s.r.x}, "y": ${s.r.y} } }`
        case 'XYRRT': return `{ "kind": "XYRRT", "c": { "x": ${s.c.x}, "y": ${s.c.y} }, "r": { "x": ${s.r.x}, "y": ${s.r.y} }, "t": ${s.t} }`
    }
}

export type Float = {
    neg: boolean
    exp: number
    mant: bigint
}

function toFloat(x: number): Float {
    const buf = Buffer.alloc(8)
    buf.writeDoubleBE(x, 0)
    const neg = !!(buf[0] & 0x80)
    const exp = ((buf.readUint16BE(0) & 0x7ff0) >> 4) - 1023
    const mant = buf.readBigUint64BE() & BigInt('0xfffffffffffff')
    return { neg, exp, mant, }
}

const b64i2c = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
const b64c2i: { [c: string]: number } = {}
b64i2c.split('').forEach((c, i) => {
    b64c2i[c] = i
})

export const getB64Char = (buf: Buffer, bitIdx: number): string => {
    const byteIdx = bitIdx >> 3
    const bitOffset = bitIdx & 0x7
    let b = buf[byteIdx]
    if (bitOffset <= 2) {
        const i = (b >> (2 - bitOffset)) & 0x3f
        return b64i2c[i]
    }
    const numBitsFirstByte = 8 - bitOffset
    let i = b & ((1 << numBitsFirstByte) - 1)
    const numBitsSecondByte = 6 - numBitsFirstByte
    i <<= numBitsSecondByte
    b = buf[byteIdx + 1]
    i |= b >> (8 - numBitsSecondByte) & ((1 << numBitsSecondByte) - 1)
    // const i = (b >> (7 - bitInByte)) & 0x1
    return b64i2c[i]
}

export const encodeXYRRT = (xyrrt: XYRRT<number>): string => {
    const { c, r, t } = xyrrt
    // 3 + 5 + 5*14 = 78 bits
    const shapeBits = 3
    const expBits = 5
    const mantBits = 14
    const totalBits = shapeBits + expBits + 5 * mantBits
    const totalBytes = ceil(totalBits / 8)
    const buf = Buffer.alloc(10)
    const floats = [ c.x, c.y, r.x, r.y ].map(toFloat)
    console.log("floats:", floats)
    const maxExp = max(...floats.map(({ exp, mant }) => (mant > 0n ? exp + 1 : exp)))
    console.log("maxExp:", maxExp)
    const n = 13
    if (maxExp >= (1 << (expBits - 1))) {
        throw Error(`maxExp ${maxExp} >= ${1 << expBits}: ${xyrrt}`)
    }
    buf[0] |= (maxExp + (1 << (expBits - 1))) & ((1 << expBits) - 1)
    const scaledFloats = floats.map(({ neg, exp, mant }) => {
        if (maxExp > exp) {
            mant = (mant | (1n << 52n)) >> BigInt(maxExp - exp + 53 - mantBits)
        } else {
            mant = mant >> BigInt(53 - mantBits)
        }
        return ({ neg, mant: Number(mant) })
    })
    console.log("scaledFloats:", scaledFloats)
    let neg: boolean
    let mant: number
    let f: { neg: boolean, mant: number }
    f = scaledFloats[0]; neg = f.neg; mant = f.mant
    if (neg) buf[1] |= 0x80
    buf[1] |= (mant >> (n - 7)) & ((1<<7) - 1)
    buf[2] |= (mant & 0x3f) << 2
    f = scaledFloats[1]; neg = f.neg; mant = f.mant
    if (neg) buf[2] |= 0x20
    buf[2] |= (mant >> (n - 1)) & 0x1
    buf[3] = (mant >> (n - 8 - 1)) & 0xff
    buf[4] = (mant & 0xf) << 4
    f = scaledFloats[2]; neg = f.neg; mant = f.mant
    if (neg) buf[4] |= 0x8
    buf[4] |= (mant >> (n - 3)) & 0x7
    buf[5] = (mant >> (n - 8 - 3)) & 0xff
    buf[6] = (mant & 0x3) << 6
    f = scaledFloats[3]; neg = f.neg; mant = f.mant
    if (neg) buf[6] |= 0x20
    buf[6] |= (mant >> (n - 5)) & 0x1f
    buf[7] = (mant >> (n - 8 - 5)) & 0xff
    const tf = toFloat((t + tau) % tau / tau); neg = tf.neg; let tfMant = tf.mant
    if (tf.exp > 0) {
        throw Error(`t ${js(tf)} out of range: ${js(f)}, ${js(xyrrt)}`)
    } else if (tf.exp < 0) {
        tfMant = (tfMant | (1n << 52n)) >> BigInt(-tf.exp)
    }
    tfMant >>= BigInt(53 - mantBits)
    console.log("tf:", tf, tfMant)
    let tfMantN = Number(tfMant)
    if (neg) buf[8] |= 0x80
    buf[8] |= (tfMantN >> (n - 7)) & ((1<<7) - 1)
    buf[9] |= (tfMantN & 0x3f) << 2

    console.log(buf)
    const b64Chars = ceil(totalBits / 6)
    return Array(b64Chars).fill(0).map((_, i) => getB64Char(buf, i * 6)).join('')
}

export const shapeParam: Param<Shape<number>> = {
    encode(s: Shape<number>): string {
        let buf: Buffer
        switch (s.kind) {
            // Shape ID bits:
            //   - 0: XYRRT
            //   - 100: XYRR
            //   - 101: Circle
            //
            case 'Circle':
                // 3 + 5 + 3*12 = 44 bits, 8xb64
                buf = Buffer.alloc(6)
                // const { c, r } = s
                throw Error(`TODO: Circle`)
            case 'XYRR':
                // 3 + 5 + 4*12 = 56 bits, 10xb64
                buf = Buffer.alloc(7)
                // const { c, r } = s
                throw Error(`TODO: XYRR`)
            case 'XYRRT':
                return encodeXYRRT(s)
        }
    },
    decode(v: string | undefined): Shape<number> {
        throw Error(`TODO: decode`)
    }
}

export const shapesParam: Param<Shape<number>[] | null> = {
    encode(shapes: Shape<number>[] | null): string | undefined {
        if (!shapes) return undefined
        return shapes.map(shape => shapeParam.encode(shape)).join('')
        // return encodeURIComponent(JSON.stringify(shapes))
    },
    decode(v: string | undefined): Shape<number>[] | null {
        if (!v) return null
        throw Error(`TODO: decode`)
        // const shapes: Shape<number>[] = []
        // let s = v
        // let shape: Shape<number>
        // while (s) {
        //     [shape, s] = nextShape(s)
        //     shapes.push(shape)
        // }
        // return shapes
    },
}
