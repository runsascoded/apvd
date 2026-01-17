export type Float = {
    neg: boolean
    exp: number
    mant: bigint
}

export function toFloat(x: number): Float {
    const buf = new ArrayBuffer(8)
    const view = new DataView(buf)
    view.setFloat64(0, x, false) // big-endian
    const byte0 = view.getUint8(0)
    const neg = !!(byte0 & 0x80)
    const exp = ((view.getUint16(0, false) & 0x7ff0) >> 4) - 1023
    const mant = view.getBigUint64(0, false) & 0xfffffffffffffn
    return { neg, exp, mant, }
}

export function fromFloat({ neg, exp, mant }: Float): number {
    const buf = new ArrayBuffer(8)
    const view = new DataView(buf)
    view.setBigUint64(0, (neg ? 0x8000000000000000n : 0n) | (BigInt(exp + 1023) << 52n) | mant, false)
    return view.getFloat64(0, false)
}
