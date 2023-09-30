import {js} from "./utils";
import {floor, log2} from "./math";
import {Float} from "./float";

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
    const downshiftBy = exp - fExp + 53 - mantBits
    const roundUp = mant & (1n << BigInt(downshiftBy - 1))
    mant >>= BigInt(downshiftBy)
    if (roundUp) {
        mant += 1n
    }
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
