import {ceil, max, min} from "./math";
import {b64c2i, b64i2c} from "./base64";
import {fromFloat, toFloat} from "./float";
import {fromFixedPoint, toFixedPoint} from "./fixed-point";

export default class BitBuffer {
    buf: number[]
    byteOffset: number
    bitOffset: number
    end: number
    constructor(numBytes?: number) {
        this.buf = Array(numBytes || 0).fill(0);
        this.byteOffset = 0;
        this.bitOffset = 0;
        this.end = 0;
    }

    static b64ToBuf(s: string): BitBuffer {
        const totalBits = s.length * 6
        const numBytes = ceil(totalBits / 8)
        const b64Chars = s.split('').map(c => b64c2i[c])
        const buf = new BitBuffer(numBytes)
        b64Chars.forEach(i => {
            buf.encodeInt(i, 6)
        })
        return buf.seek(0)
    }

    get totalBitOffset(): number {
        return this.byteOffset * 8 + this.bitOffset
    }
    seek(totalBitOffset: number): BitBuffer {
        this.byteOffset = totalBitOffset >> 3
        this.bitOffset = totalBitOffset & 7
        return this
    }
    toB64(): string {
        const b64Chars = ceil(this.totalBitOffset / 6)
        this.seek(0)
        // console.log(buf, bitOffset, b64Chars)
        return Array(b64Chars).fill(0).map(() => this.getB64Char()).join('')
    }
    getB64Char(): string {
        return b64i2c[this.decodeInt(6)]
    }

    encodeInt(n: number, numBits: number): BitBuffer {
        let { buf, byteOffset, bitOffset } = this
        while (numBits > 0) {
            if (byteOffset >= buf.length) {
                // console.log(`${byteOffset}:${BitOffset} >= ${buf.length}, pushing 0 (${numBits} bits left)`)
                buf.push(0)
            }
            const remainingBitsInByte = 8 - bitOffset
            const bitsToWrite = min(numBits, remainingBitsInByte)
            const bitsLeftInByte = remainingBitsInByte - bitsToWrite
            const bitsLeftToWrite = numBits - bitsToWrite
            const mask = ((1 << bitsToWrite) - 1) << bitsLeftToWrite
            const shiftedBitsToWrite = (n & mask) >> bitsLeftToWrite
            buf[byteOffset] |= shiftedBitsToWrite << bitsLeftInByte
            // console.log(`wrote ${bitsToWrite} bits (${shiftedBitsToWrite}) at ${byteOffset}:${bitOffset} (${bitsLeftInByte} bits left in byte). Byte: ${buf[byteOffset]}`)
            n &= (1 << bitsLeftToWrite) - 1
            numBits -= bitsToWrite
            bitOffset += bitsToWrite
            if (bitOffset == 8) {
                bitOffset = 0
                byteOffset++
            }
        }
        this.byteOffset = byteOffset
        this.bitOffset = bitOffset
        if (this.totalBitOffset > this.end) this.end = this.totalBitOffset
        return this
    }

    decodeInt(numBits: number): number {
        let { buf, byteOffset, bitOffset } = this
        // console.log("decodeInt:", buf, bitOffset, numBits, "byteOffset:", byteOffset, "bitOffset:", bitOffset)
        let n = 0
        while (numBits > 0) {
            const remainingBitsInByte = 8 - bitOffset
            const bitsToRead = min(numBits, remainingBitsInByte)
            const bitsLeftInByte = remainingBitsInByte - bitsToRead
            const bitsLeftToRead = numBits - bitsToRead
            const mask = ((1 << bitsToRead) - 1) << bitsLeftInByte
            const shiftedBitsToRead = (buf[byteOffset] & mask) >> bitsLeftInByte
            n |= shiftedBitsToRead << bitsLeftToRead
            numBits -= bitsToRead
            bitOffset += bitsToRead
            if (bitOffset == 8) {
                bitOffset = 0
                byteOffset++
            }
        }
        this.byteOffset = byteOffset
        this.bitOffset = bitOffset
        if (this.totalBitOffset > this.end) {
            throw Error(`Overflow: totalBitOffset ${this.totalBitOffset} > end ${this.end}`)
        }
        // console.log("read:", n)
        return n
    }

    encodeFixedPoints(
        vals: number[],
        { expBits, mantBits }: { expBits: number, mantBits: number }
    ) {
        const floats = vals.map(toFloat)
        // console.log("floats:", floats)
        const maxExp = max(...floats.map(({ exp, mant }) => (mant > 0n ? exp + 1 : exp)))
        // console.log("maxExp:", maxExp)
        if (maxExp >= (1 << (expBits - 1))) {
            throw Error(`maxExp ${maxExp} >= ${1 << expBits}`)
        }
        const expToWrite = (maxExp + (1 << (expBits - 1))) & ((1 << expBits) - 1)
        // console.log(`expToWrite: ${expToWrite} at ${bitOffset}`)
        this.encodeInt(expToWrite, expBits)
        const fixedPoints = floats.map(f => toFixedPoint(f, { mantBits, exp: maxExp }))
        // console.log("fixedPoints:", fixedPoints)
        fixedPoints.forEach(({ neg, mant }) => {
            // console.log(`writing float ${idx} at bit offset ${bitOffset}`)
            this.encodeInt(neg ? 1 : 0, 1)
            this.encodeInt(mant, mantBits)
        })
    }
    decodeFixedPoints(
        { expBits, mantBits, numFloats }: {
            expBits: number
            mantBits: number
            numFloats: number
        }
    ): number[] {
        const writtenExp = this.decodeInt(expBits)
        const exp = writtenExp - (1 << (expBits - 1))
        // console.log(`decodeFixedPoints: writtenExp ${writtenExp}, exp ${exp}`)
        const floats: number[] = []
        for (let i = 0; i < numFloats; i++) {
            const neg = !!this.decodeInt(1)
            const mant = this.decodeInt(mantBits)
            const f = fromFixedPoint({ neg, exp, mant }, mantBits)
            floats.push(fromFloat(f))
        }
        return floats
    }
}
