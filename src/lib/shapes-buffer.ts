import BitBuffer from "./bit-buffer";
import {fromFloat, toFloat} from "./float";
import {tau} from "./math";
import {FixedPoint, fromFixedPoint, toFixedPoint} from "./fixed-point";
import {Circle, Shape, XYRR, XYRRT} from "./shape";

export default class ShapesBuffer {
    buf: BitBuffer
    expBits: number = 5
    mantBits: number = 13

    ID = {
        XYRRT: 0,
        XYRR: 4,
        Circle: 5,
    }
    ShapeBits = 3

    constructor(buf?: BitBuffer, { expBits, mantBits }: { expBits?: number, mantBits?: number } = {}) {
        this.buf = buf || new BitBuffer()
        if (expBits) this.expBits = expBits
        if (mantBits) this.mantBits = mantBits
    }

    static fromB64(s: string): ShapesBuffer {
        return new ShapesBuffer(BitBuffer.b64ToBuf(s))
    }

    toB64(): string { return this.buf.toB64() }
    get totalBitOffset(): number { return this.buf.totalBitOffset }
    seek(totalBitOffset: number): ShapesBuffer { this.buf.seek(totalBitOffset); return this }

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
        buf.encodeInt(mant, floatBits)
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
        const tsf: FixedPoint = { neg: false, exp: 0, mant: buf.decodeInt(floatBits) }
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
            // Shape ID bits:
            //   - 0: XYRRT
            //   - 100: XYRR
            //   - 101: Circle
            //
            case 'Circle':
                // 3 + 5 + 3*14 = 50 bits, 9xb64
                return this.encodeCircle(s)
            case 'XYRR':
                // 3 + 5 + 4*14 = 64 bits, 11xb64
                return this.encodeXYRR(s)
            case 'XYRRT':
                return this.encodeXYRRT(s)
        }
    }
    decodeShape(): Shape<number> {
        const shapeId = this.buf.decodeInt(3)
        switch (shapeId) {
            case 0: return this.decodeXYRRT()
            case 4: return this.decodeXYRR()
            case 5: return this.decodeCircle()
            default: throw Error(`unknown shapeId ${shapeId}`)
        }
    }

}
