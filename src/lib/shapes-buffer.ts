import BitBuffer from "./bit-buffer";
import {fromFloat, toFloat} from "./float";
import {tau} from "./math";
import {FixedPoint, fromFixedPoint, toFixedPoint} from "./fixed-point";
import {Circle, Shape, XYRR, XYRRT} from "./shape";

export type Opts = {
    precisionScheme?: PrecisionScheme,
    precisionSchemeId?: number
    expBits?: number
    mantBits?: number
}

export type PrecisionScheme = {
    id?: number
    expBits: number
    mantBits: number
}
export const precisionSchemes = [
    { id: 0, expBits: 5, mantBits: 16 },
    { id: 1, expBits: 5, mantBits: 22 },
    { id: 2, expBits: 5, mantBits: 28 },
    { id: 3, expBits: 5, mantBits: 34 },
    { id: 4, expBits: 5, mantBits: 40 },
    { id: 5, expBits: 5, mantBits: 46 },
    { id: 6, expBits: 5, mantBits: 52 },
]

export type ShapesParam = {
    shapes: Shape<number>[]
    precisionSchemeId: number
}

export default class ShapesBuffer {
    buf: BitBuffer
    precisionScheme: PrecisionScheme

    ID = {
        XYRRT: 0,
        XYRR: 4,
        Circle: 5,
    }
    ShapeBits = 3

    constructor({ buf, precisionScheme, precisionSchemeId, expBits, mantBits, }: Opts & { buf?: BitBuffer, } = {}) {
        this.buf = buf || new BitBuffer()
        if (precisionScheme) this.precisionScheme = precisionScheme
        else if (precisionSchemeId) this.precisionScheme = precisionSchemes[precisionSchemeId]
        else if (expBits && mantBits) {
            const precisionScheme = precisionSchemes.find(ps => ps.expBits === expBits && ps.mantBits === mantBits)
            if (!precisionScheme) throw Error(`no precisionScheme for expBits ${expBits} mantBits ${mantBits}`)
            this.precisionScheme = precisionScheme
        } else {
            this.precisionScheme = { expBits: 5, mantBits: 13 }
        }
    }

    static fromB64(s: string, opts: Opts = {}): ShapesBuffer {
        return new ShapesBuffer({ buf: BitBuffer.b64ToBuf(s), ...opts })
    }

    static fromShapes(shapes: Shape<number>[], opts: Opts = {}): ShapesBuffer {
        const buf = new ShapesBuffer(opts)
        buf.encodeShapes(shapes)
        return buf
    }

    toB64(): string { return this.buf.toB64() }
    get totalBitOffset(): number { return this.buf.totalBitOffset }
    seek(totalBitOffset: number): ShapesBuffer { this.buf.seek(totalBitOffset); return this }
    get end(): number { return this.buf.end }
    get mantBits(): number { return this.precisionScheme.mantBits }
    get expBits(): number { return this.precisionScheme.expBits }
    done(): boolean {
        let totalBitOffset = this.totalBitOffset
        const overhang = totalBitOffset % 6
        if (overhang) {
            totalBitOffset += 6 - overhang
        }
        return totalBitOffset >= this.end
    }

    encodeXYRRT(xyrrt: XYRRT<number>): ShapesBuffer {
        const { buf, mantBits, expBits, ID, ShapeBits } = this
        const { c, r, t } = xyrrt
        // 3 + 5 + 5*14 = 78 bits
        buf.encodeInt(ID.XYRRT, ShapeBits)
        const floatBits = mantBits + 1
        buf.encodeFixedPoints([ c.x, c.y, r.x, r.y ], { expBits, mantBits })
        const tf = toFloat((t + tau) % tau / tau)
        const tfp = toFixedPoint(tf, { mantBits: floatBits, exp: 0, })
        // console.log("theta:", t, "tf:", tf, tf.mant.toString(16), "tfp:", tfp, tfp.mant.toString(16))
        let mant = tfp.mant
        buf.encodeBigInt(mant, floatBits)
        return this
    }

    decodeXYRRT(): XYRRT<number> {
        const { buf, mantBits, expBits } = this
        // console.log("decode buf:", buf)
        // Expect ShapeBits has already been processed
        const floatBits = mantBits + 1
        const [ cx, cy, rx, ry ] = buf.decodeFixedPoints({ expBits, mantBits, numFloats: 4 })
        const c = { x: cx, y: cy }
        const r = { x: rx, y: ry }
        // console.log("decode theta, bitOffset:", bitOffset)
        const tsf: FixedPoint = { neg: false, exp: 0, mant: buf.decodeBigInt(floatBits) }
        const tf = fromFixedPoint(tsf, floatBits)
        const t = fromFloat(tf) * tau
        return { kind: 'XYRRT', c, r, t, }
    }

    encodeXYRR(xyrr: XYRR<number>): ShapesBuffer {
        const { buf, mantBits, expBits, ID, ShapeBits } = this
        const { c, r } = xyrr
        // 3 + 5 + 4*14 = 64 bits
        buf.encodeInt(ID.XYRR, ShapeBits)
        buf.encodeFixedPoints([ c.x, c.y, r.x, r.y ], { expBits, mantBits })
        return this
    }

    decodeXYRR(): XYRR<number> {
        const {buf, mantBits, expBits} = this
        // console.log("decode buf:", buf)
        // Expect ShapeBits has already been processed
        const [cx, cy, rx, ry] = buf.decodeFixedPoints({expBits, mantBits, numFloats: 4})
        const c = {x: cx, y: cy}
        const r = {x: rx, y: ry}
        return { kind: 'XYRR', c, r, }
    }

    encodeCircle(circle: Circle<number>): ShapesBuffer {
        const { buf, mantBits, expBits, ID, ShapeBits } = this
        const { c, r } = circle
        // 3 + 5 + 3*14 = 50 bits
        buf.encodeInt(ID.Circle, ShapeBits)
        buf.encodeFixedPoints([ c.x, c.y, r ], { expBits, mantBits })
        return this
    }

    decodeCircle(): Circle<number> {
        const { buf, mantBits, expBits } = this
        // console.log("decode buf:", buf)
        // Expect ShapeBits has already been processed
        const [ cx, cy, r ] = buf.decodeFixedPoints({ expBits, mantBits, numFloats: 3 })
        const c = { x: cx, y: cy }
        return { kind: 'Circle', c, r, }
    }
    encodeShape(s: Shape<number>): ShapesBuffer {
        switch (s.kind) {
            case 'Circle': return this.encodeCircle(s)
            case   'XYRR': return this.encodeXYRR(s)
            case  'XYRRT': return this.encodeXYRRT(s)
        }
    }
    decodeShape(): Shape<number> {
        const shapeId = this.buf.decodeInt(3)
        // Shape ID bits:
        //   - 0: XYRRT
        //   - 100: XYRR
        //   - 101: Circle
        switch (shapeId) {
            case 0: return this.decodeXYRRT()
            case 4: return this.decodeXYRR()
            case 5: return this.decodeCircle()
            default: throw Error(`unknown shapeId ${shapeId}`)
        }
    }
    encodeShapes(shapes: Shape<number>[]): ShapesBuffer {
        let precisionSchemeId = this.precisionScheme.id || 0
        if (precisionSchemeId < 0 || precisionSchemeId >= precisionSchemes.length) {
            throw Error(`precisionSchemeId ${precisionSchemeId} out of range`)
        }
        this.precisionScheme = precisionSchemes[precisionSchemeId]
        this.buf.encodeInt(precisionSchemeId, 3)
        shapes.forEach(s => this.encodeShape(s))
        return this
    }
    decodeShapes(num?: number): ShapesParam {
        const precisionSchemeId = this.buf.decodeInt(3)
        if (precisionSchemeId < 0 || precisionSchemeId >= precisionSchemes.length) {
            throw Error(`precisionSchemeId ${precisionSchemeId} out of range`)
        }
        this.precisionScheme = precisionSchemes[precisionSchemeId]
        console.log("decoding shapes with precisionScheme:", this.precisionScheme)
        const shapes: Shape<number>[] = []
        if (num === undefined) {
            while (!this.done()) {
                shapes.push(this.decodeShape())
            }
        } else {
            for (let i = 0; i < num; i++) {
                shapes.push(this.decodeShape())
            }
        }
        return { shapes, precisionSchemeId }
    }
}
