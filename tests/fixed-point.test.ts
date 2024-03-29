import {fromFixedPoint, Opts, toFixedPoint} from "../src/lib/fixed-point";
import {fromFloat, toFloat} from "../src/lib/float";
import {js} from "../src/lib/utils";
import BitBuffer from "../src/lib/bit-buffer";

describe("test FixedPoint round-trips", () => {
    function check(f: number, opts: Opts) {
        test(`FixedPoint round trip: ${f} ${js(opts)}`, () => {
            const float0 = toFloat(f)
            // const buf = Buffer.alloc(8)
            // buf.writeBigUint64BE(float0.mant, 0)
            // console.log("float0 mant:", buf)
            const fixedPoint = toFixedPoint(float0, opts)
            // console.log(`f: ${f}, Float`, float0, `FixedPoint`, fixedPoint)
            const float1 = fromFixedPoint(fixedPoint, opts.mantBits)
            // console.log("decoded float:", float1)
            const f2 = fromFloat(float1)
            expect(f2).toEqual(f)
        })
    }

    function chk(f: number, opts: Opts) {
        check( f, opts)
        if (f !== 0) {
            check(-f, opts)
        }
    }

    for (let i = 0; i < 5; i += 0.5) {
        chk(i, { mantBits: 4, })
        chk(i, { mantBits: 6, exp: 3 })
    }
    // check(0, { mantBits: 4, })
})

describe('test FixedPoint', () => {
  test('encodeFixedPoints', () => {
      const buf = new BitBuffer()
      const vals0 = [-0.5, 0, 1, 1]
      buf.encodeFixedPoints(vals0, { expBits: 3, mantBits: 4 })
      buf.seek(0)
      const vals1 = buf.decodeFixedPoints({ expBits: 3, mantBits: 4, numFloats: 4 })
      expect(vals1).toEqual(vals0)
  })
})
