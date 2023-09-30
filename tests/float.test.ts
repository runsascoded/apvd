import {fromFloat, toFloat} from "../src/lib/float";
import {pi, pi2, tau} from "../src/lib/math";

describe('test float round trips', () => {
    function check(f: number) {
        test(`float round trip: ${f}`, () => {
            const float = toFloat(f)
            const f2 = fromFloat(float)
            expect(f2).toEqual(f)
        })
    }
    function chk(f: number) {
        check(f)
        check(-f)
    }
    chk(1)
    chk(2)
    chk(0.5)
    chk(pi)
    chk(pi2)
    chk(tau)
    check(0)
    chk(4)
    chk(4.5)
    chk(5)
    chk(5.5)
    chk(0.25)
    chk(0.75)
    chk(0.125)
    chk(0.625)
    chk(0.875)
})
