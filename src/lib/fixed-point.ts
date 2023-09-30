import {js} from "./utils";
import {floor, log2, max} from "./math";
import {Float, fromFloat, toFloat} from "./float";
import {decodeInt, encodeInt} from "./shape";

export type FixedPoint = {
    neg: boolean
    exp: number
    mant: number
}

export type Opts = { mantBits: number, exp?: number }
export function toFixedPoint(f: Float, { mantBits, exp }: Opts): FixedPoint {
    let { neg, exp: fExp, mant } = f
    fExp++
    exp = exp === undefined ? fExp : exp
    if (fExp > exp) {
        throw Error(`maxExp ${exp} < ${fExp}: ${js(f)}`)
    }
    mant >>= BigInt(exp - fExp + 53 - mantBits)
    mant |= 1n << BigInt(mantBits - 1 - (exp - fExp))
    return ({ neg, exp, mant: Number(mant) })
}

export function fromFixedPoint(f: FixedPoint, mantBits: number): Float {
    let { neg } = f
    const nonZeroBits = f.mant ? floor(log2(f.mant)) + 1 : 0
    const exp = f.exp - (mantBits - nonZeroBits) - 1
    if (!f.mant) {
        return ({ neg, exp: -1023, mant: 0n })
    }
    let mant = BigInt(f.mant)
    mant = mant & ((1n << BigInt(nonZeroBits - 1)) - 1n)
    mant <<= BigInt(f.exp - exp)
    mant <<= BigInt(52 - mantBits)
    // console.log("fromFixedPoint:", f, "exp:", exp, "f.exp:", f.exp, "mant:", mant)
    // const buf = Buffer.alloc(8)
    // buf.writeBigUint64BE((neg ? 0x8000000000000000n : 0n) | (BigInt(exp + 1023) << 52n) | mant)
    // console.log("buf:", buf)
    return ({ neg, exp, mant })
}

export function encodeFixedPoints(
    vals: number[],
    { buf, bitOffset, expBits, mantBits }: {
        buf: number[]
        bitOffset: number
        expBits: number
        mantBits: number
    }
): number {
    const floats = vals.map(toFloat)
    // console.log("floats:", floats)
    const maxExp = max(...floats.map(({ exp, mant }) => (mant > 0n ? exp + 1 : exp)))
    // console.log("maxExp:", maxExp)
    if (maxExp >= (1 << (expBits - 1))) {
        throw Error(`maxExp ${maxExp} >= ${1 << expBits}`)
    }
    const expToWrite = (maxExp + (1 << (expBits - 1))) & ((1 << expBits) - 1)
    // console.log(`expToWrite: ${expToWrite} at ${bitOffset}`)
    bitOffset = encodeInt({ buf, bitOffset, }, expToWrite, expBits)
    const fixedPoints = floats.map(f => toFixedPoint(f, { mantBits, exp: maxExp }))
    // console.log("fixedPoints:", fixedPoints)
    fixedPoints.forEach(({ neg, mant }, idx) => {
        // console.log(`writing float ${idx} at bit offset ${bitOffset}`)
        bitOffset = encodeInt({ buf, bitOffset, }, neg ? 1 : 0, 1)
        bitOffset = encodeInt({ buf, bitOffset, }, mant, mantBits)
    })
    return bitOffset
}

export function decodeFixedPoints(
    { buf, bitOffset, expBits, mantBits, numFloats }: {
        buf: number[]
        bitOffset: number
        expBits: number
        mantBits: number
        numFloats: number
    }
): { vals: number[], exp: number, bitOffset: number } {
    const writtenExp = decodeInt({ buf, bitOffset, numBits: expBits })
    bitOffset += expBits
    const exp = writtenExp - (1 << (expBits - 1))
    // console.log(`decodeFixedPoints: writtenExp ${writtenExp}, exp ${exp}`)
    const floats: number[] = []
    for (let i = 0; i < numFloats; i++) {
        const neg = !!decodeInt({ buf, bitOffset, numBits: 1 })
        bitOffset++
        const mant = decodeInt({ buf, bitOffset, numBits: mantBits })
        bitOffset += mantBits
        const f = fromFixedPoint({ neg, exp, mant }, mantBits)
        floats.push(fromFloat(f))
    }
    return { vals: floats, exp, bitOffset }
}
