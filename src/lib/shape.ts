import {R2} from "apvd";
import {abs, ceil, cos, floor, log2, max, min, sin, tau} from "./math";
import {Param} from "next-utils/params";
import {js} from "./utils";
import {fromFloat, toFloat} from "./float";
import {decodeFixedPoints, encodeFixedPoints, fromFixedPoint, FixedPoint, toFixedPoint} from "./fixed-point";

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

const b64i2c =
    '01234567' + '89abcdef' +
    'ghijklmn' + 'opqrstuv' +
    'wxyzABCD' + 'EFGHIJKL' +
    'MNOPQRST' + 'UVWXYZ-_'
const b64c2i: { [c: string]: number } = {}
b64i2c.split('').forEach((c, i) => {
    b64c2i[c] = i
})

export const getB64Char = (buf: number[], bitIdx: number): string => {
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

// export const setB64Char = (buf: number[], bitIdx: number, c: string): void => {
//     const byteIdx = bitIdx >> 3
//     const bitOffset = bitIdx & 0x7
//     const i = b64c2i[c]
//     const numBitsFirstByte = min(6, 8 - bitOffset)
//     const numBitsSecondByte = 6 - numBitsFirstByte
//     let newBits = (i >> numBitsSecondByte) << (8 - bitOffset)
//     buf[byteIdx] |= newBits
//     if (numBitsSecondByte) {
//         newBits = (i & ((1 << numBitsSecondByte) - 1)) << (8 - numBitsSecondByte)
//         buf[byteIdx + 1] |= newBits
//     }
// }

export function encodeInt({ buf, bitOffset, }: { buf: number[], bitOffset: number, }, n: number, numBits: number): number {
    let curByteOffset = bitOffset >> 3
    let curBitOffset = bitOffset & 0x7
    while (numBits > 0) {
        if (curByteOffset >= buf.length) {
            // console.log(`${curByteOffset}:${curBitOffset} >= ${buf.length}, pushing 0 (${numBits} bits left)`)
            buf.push(0)
        }
        const remainingBitsInByte = 8 - curBitOffset
        const bitsToWrite = min(numBits, remainingBitsInByte)
        const bitsLeftInByte = remainingBitsInByte - bitsToWrite
        const bitsLeftToWrite = numBits - bitsToWrite
        const mask = ((1 << bitsToWrite) - 1) << bitsLeftToWrite
        const shiftedBitsToWrite = (n & mask) >> bitsLeftToWrite
        buf[curByteOffset] |= shiftedBitsToWrite << bitsLeftInByte
        // console.log(`wrote ${bitsToWrite} bits (${shiftedBitsToWrite}) at ${curByteOffset}:${curBitOffset} (${bitsLeftInByte} bits left in byte). Byte: ${buf[curByteOffset]}`)
        n &= (1 << bitsLeftToWrite) - 1
        numBits -= bitsToWrite
        curBitOffset += bitsToWrite
        if (curBitOffset == 8) {
            curBitOffset = 0
            curByteOffset++
        }
    }
    return curByteOffset * 8 + curBitOffset
}

export function decodeInt({ buf, bitOffset, numBits }: { buf: number[], bitOffset: number, numBits: number }): number {
    let curByteOffset = bitOffset >> 3
    let curBitOffset = bitOffset & 0x7
    // console.log("decodeInt:", buf, bitOffset, numBits, "curByteOffset:", curByteOffset, "curBitOffset:", curBitOffset)
    let n = 0
    while (numBits > 0) {
        const remainingBitsInByte = 8 - curBitOffset
        const bitsToRead = min(numBits, remainingBitsInByte)
        const bitsLeftInByte = remainingBitsInByte - bitsToRead
        const bitsLeftToRead = numBits - bitsToRead
        const mask = ((1 << bitsToRead) - 1) << bitsLeftInByte
        const shiftedBitsToRead = (buf[curByteOffset] & mask) >> bitsLeftInByte
        n |= shiftedBitsToRead << bitsLeftToRead
        numBits -= bitsToRead
        curBitOffset += bitsToRead
        if (curBitOffset == 8) {
            curBitOffset = 0
            curByteOffset++
        }
    }
    // console.log("read:", n)
    return n
}

export const encodeXYRRT = (xyrrt: XYRRT<number>): string => {
    const { c, r, t } = xyrrt
    // 3 + 5 + 5*14 = 78 bits
    const shapeBits = 3
    const expBits = 5
    const mantBits = 13
    const floatBits = mantBits + 1
    const buf: number[] = []
    let bitOffset = 3;
    bitOffset = encodeFixedPoints([ c.x, c.y, r.x, r.y ], { buf, bitOffset, expBits, mantBits })
    const tf = toFixedPoint(
        toFloat((t + tau) % tau / tau),
        { mantBits: floatBits, exp: 0, },
    )
    let mant = tf.mant
    bitOffset = encodeInt({ buf, bitOffset }, mant, floatBits)

    const b64Chars = ceil(bitOffset / 6)
    // console.log(buf, bitOffset, b64Chars)
    return Array(b64Chars).fill(0).map((_, i) => getB64Char(buf, i * 6)).join('')
}

export const decodeXYRRT = (s: string): XYRRT<number> => {
    const totalBits = s.length * 6
    const numBytes = ceil(totalBits / 8)
    const b64Chars = s.split('').map(c => b64c2i[c])
    const buf = Array(numBytes).fill(0)
    let bitOffset = 3  // TODO: verify shapes portion
    b64Chars.forEach((i, idx) => {
        encodeInt({ buf, bitOffset: idx * 6, }, i, 6)
    })
    // console.log("decode buf:", buf)
    const expBits = 5
    const mantBits = 13
    const floatBits = mantBits + 1
    const fps = decodeFixedPoints({ buf, bitOffset, expBits, mantBits, numFloats: 4 })
    const { vals: [ cx, cy, rx, ry ], exp } = fps
    bitOffset = fps.bitOffset
    const c = { x: cx, y: cy }
    const r = { x: rx, y: ry }
    // console.log("decode theta, bitOffset:", bitOffset)
    const tsf: FixedPoint = { neg: false, exp: 0, mant: decodeInt({ buf, bitOffset, numBits: floatBits }) }
    bitOffset += floatBits
    const tf = fromFixedPoint(tsf, floatBits)
    const t = fromFloat(tf) * tau
    return { kind: 'XYRRT', c, r, t, }
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
                // 3 + 5 + 3*14 = 50 bits, 9xb64
                buf = Buffer.alloc(6)
                // const { c, r } = s
                throw Error(`TODO: Circle`)
            case 'XYRR':
                // 3 + 5 + 4*14 = 64 bits, 11xb64
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
