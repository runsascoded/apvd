import {pi2, pi4, tau} from "../src/lib/math";
import {Shape} from "../src/lib/shape";
import {Point} from "../src/components/point";
import ShapesBuffer, {Opts} from "../src/lib/shapes-buffer";

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

type Extra = { decoded?: Shape<number>[] } & Opts

describe('test encoding various shapes', () => {
    function check(shapes0: Shape<number>[], expected: string, { decoded, ...opts }: Extra) {
        const encoded = ShapesBuffer.fromShapes(shapes0, opts).toB64()
        expect(encoded).toEqual(expected)
        const shapes1 = ShapesBuffer.fromB64(encoded, opts).decodeShapes(shapes0.length)
        decoded = decoded || shapes0
        expect(shapes1).toEqual(decoded)

    }
    function chk(expected: string, shapes0: Shape<number>[], extra: Extra = {}) {
        test(expected, () => check(shapes0, expected, extra))
    }

    chk(
        "4g00w0g0601004g00w0g0601w04g00w0g0603004g02w0M0e0300",
        [
            { kind: 'XYRRT', c: { x: 0, y:  0.5 }, r: { x:  1, y:  1.5 }, t:     pi2 },
            { kind: 'XYRRT', c: { x: 0, y:  0.5 }, r: { x:  1, y:  1.5 }, t:   3*pi4 },
            { kind: 'XYRRT', c: { x: 0, y:  0.5 }, r: { x:  1, y:  1.5 }, t: tau-pi2 },
            { kind: 'XYRRT', c: { x: 0, y: -0.5 }, r: { x: -1, y: -1.5 }, t: tau-pi2 },
        ],
    )

    const mixedShapes: Shape<number>[] = [
        { kind: 'Circle', c: { x: 3.3, y: -4.4 }, r:      5.5                       },
        { kind:   'XYRR', c: { x: 0.1, y:  0   }, r: { x: 3  , y: 1   }             },
        { kind:  'XYRRT', c: { x: -10, y: -1   }, r: { x: 2.1, y: 2.1 }, t: tau / 5 },
    ]
    chk("IPjf6qm0983d00600w05d02804cN3cPd", mixedShapes, {
        decoded: [
            { kind: 'Circle', c: { x:   3.2998046875 , y: -4.400390625 }, r:      5.5                                                  },
            { kind:   'XYRR', c: { x:   0.10009765625, y:  0           }, r: { x: 3          , y: 1           }                        },
            { kind:  'XYRRT', c: { x: -10            , y: -1           }, r: { x: 2.099609375, y: 2.099609375 }, t: 1.2567137604753116 },
        ]},
    )
    chk("IPjcT6pCm00983cP0006000w005d0028004cPh3cQPcP", mixedShapes, {
        mantBits: 19,
        decoded: [
            { kind: 'Circle', c: { x:   3.3000030517578125 , y: -4.399993896484375 }, r:      5.5                                                              },
            { kind:   'XYRR', c: { x:   0.09999847412109375, y:  0                 }, r: { x: 3                , y: 1                 }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                 }, r: { x: 2.100006103515625, y: 2.100006103515625 }, t: 1.2566358630134267 },
        ]},
    )
    chk("IPjcPf6pCqm000983cPd000060000w0005d000280004cPcN3cPcPcPd", mixedShapes, {
        mantBits: 25,
        decoded: [
            { kind: 'Circle', c: { x:   3.299999952316284  , y: -4.400000095367432 }, r:      5.5                                                                },
            { kind:   'XYRR', c: { x:   0.10000002384185791, y:  0                 }, r: { x: 3                 , y: 1                  }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                 }, r: { x: 2.0999999046325684, y: 2.0999999046325684 }, t: 1.2566370801612687 },
        ]},
    )
    chk("IPjcPcT6pCpCm0000983cPcP00000600000w00005d00002800004cPcPh3cPcQPcPcP", mixedShapes, {
        mantBits: 31,
        decoded: [
            { kind: 'Circle', c: { x:   3.300000000745058  , y: -4.399999998509884 }, r:      5.5                                                              },
            { kind:   'XYRR', c: { x:   0.09999999962747097, y:  0                 }, r: { x: 3                , y: 1                 }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                 }, r: { x: 2.100000001490116, y: 2.100000001490116 }, t: 1.2566370611433337 },
        ]},
    )
})
