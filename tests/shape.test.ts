import {pi2} from "../src/lib/math";
import {encodeXYRRT, Shape} from "../src/lib/shape";
import {Point} from "../src/components/point";

describe('test encoding XYRRTs', () => {
    function check(c: Point, r: Point, t: number, expected: string) {
        const xyrrt: Shape<number> = { kind: 'XYRRT', c, r, t, }
        expect(encodeXYRRT(xyrrt)).toEqual(expected)

    }
    function chk(expected: string, c: Point, r: Point, t: number, ) {
        test(expected, () => check(c, r, t, expected))
    }

    chk("4g00w0g060100", { x: 0, y:  0.5 }, { x:  1, y:  1.5 },  pi2)
    chk("4g00w0g060300", { x: 0, y:  0.5 }, { x:  1, y:  1.5 }, -pi2)
    chk("4g02w0M0e0300", { x: 0, y: -0.5 }, { x: -1, y: -1.5 }, -pi2)
})
