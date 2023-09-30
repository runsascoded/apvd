import {min} from "./math";

export const b64i2c =
    '01234567' + '89abcdef' +
    'ghijklmn' + 'opqrstuv' +
    'wxyzABCD' + 'EFGHIJKL' +
    'MNOPQRST' + 'UVWXYZ-_'
export const b64c2i: { [c: string]: number } = {}
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
