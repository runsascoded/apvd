export type Float = {
    neg: boolean
    exp: number
    mant: bigint
}

export function toFloat(x: number): Float {
    const buf = Buffer.alloc(8)
    buf.writeDoubleBE(x, 0)
    const neg = !!(buf[0] & 0x80)
    const exp = ((buf.readUint16BE(0) & 0x7ff0) >> 4) - 1023
    const mant = buf.readBigUint64BE() & BigInt('0xfffffffffffff')
    return { neg, exp, mant, }
}

export function fromFloat({ neg, exp, mant }: Float): number {
    const buf = Buffer.alloc(8)
    buf.writeBigUint64BE((neg ? 0x8000000000000000n : 0n) | (BigInt(exp + 1023) << 52n) | mant)
    return buf.readDoubleBE(0)
}
