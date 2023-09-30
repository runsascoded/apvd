import {pi2, pi4, tau} from "../src/lib/math";
import {Shape} from "../src/lib/shape";
import {Point} from "../src/components/point";
import ShapesBuffer from "../src/lib/shapes-buffer";

describe('test encoding XYRRTs', () => {
    function check(c: Point, r: Point, t: number, expected: string, decoded?: Shape<number>) {
        // const buf = ShapesBuffer.fromB64(expected)
        let buf = new ShapesBuffer()
        const xyrrt0: Shape<number> = { kind: 'XYRRT', c, r, t, }
        buf.encodeShape(xyrrt0)
        const encoded = buf.toB64()
        expect(encoded).toEqual(expected)
        buf = ShapesBuffer.fromB64(encoded)
        const xyrrt1 = buf.decodeShape()
        decoded = decoded || xyrrt0
        expect(xyrrt1).toEqual(decoded)

    }
    function chk(expected: string, c: Point, r: Point, t: number, decoded?: Shape<number>) {
        test(expected, () => check(c, r, t, expected, decoded))
    }

    chk("4g00w0g060100", { x: 0, y:  0.5 }, { x:  1, y:  1.5 },  pi2)
    chk("4g00w0g0601w0", { x: 0, y:  0.5 }, { x:  1, y:  1.5 },  3*pi4)
    chk("4g00w0g060300", { x: 0, y:  0.5 }, { x:  1, y:  1.5 }, tau-pi2)
    chk("4g02w0M0e0300", { x: 0, y: -0.5 }, { x: -1, y: -1.5 }, tau-pi2)
    chk("5ow0e0c8el1w0", { x: -2, y: 3.5 }, { x: 12.125, y: -25.3125 }, 3*pi4)
    chk("503c05kcWw1ll", { x: 0.1, y: 0.01 }, { x: 10.1, y: -5 }, tau / 3, {
        kind: "XYRRT",
        c: { x: 0.099609375, y: 0.009765625, },
        r: { x: 10.099609375, y: -5, },
        // 2.0943951023931953
        t: 2.094267270660872,
    })
})
