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
        const shapes1 = ShapesBuffer.fromB64(encoded, opts).decodeShapes(shapes0.length).shapes
        decoded = decoded || shapes0
        expect(shapes1).toEqual(decoded)

    }
    function chk(expected: string, shapes0: Shape<number>[], extra: Extra = {}) {
        test(expected, () => check(shapes0, expected, extra))
    }

    chk(
        "0y000w02006008004g00400g00M01w00y000w0200600o004g00k00M01M03000",
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
    chk("5CqpH6pGM0983cM006004005d00h004cQ8pEPcM", mixedShapes, {
        precisionSchemeId: 0,
        decoded: [
            { kind: 'Circle', c: { x:   3.300048828125 , y: -4.4000244140625 }, r:      5.5                                                      },
            { kind:   'XYRR', c: { x:   0.0999755859375, y:  0               }, r: { x: 3            , y: 1             }                        },
            { kind:  'XYRRT', c: { x: -10              , y: -1               }, r: { x: 2.10009765625, y: 2.10009765625 }, t: 1.2566178866760687 },
        ]},
    )
    chk("dCqpCr6pCqM00983cPg000600040005d000h0004cPc8pCoPcPg", mixedShapes, {
        precisionSchemeId: 1,
        decoded: [
            { kind: 'Circle', c: { x:   3.299999237060547  , y: -4.399999618530273 }, r:      5.5                                                                },
            { kind:   'XYRR', c: { x:   0.10000038146972656, y:  0                 }, r: { x: 3                 , y: 1                  }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                 }, r: { x: 2.0999984741210938, y: 2.0999984741210938 }, t: 1.2566373610415398 },
        ]},
    )
    chk("lCqpCpH6pCpGM000983cPcM000060000400005d0000h00004cPcQ8pCpEPcPcM", mixedShapes, {
        precisionSchemeId: 2,
        decoded: [
            { kind: 'Circle', c: { x:   3.300000011920929  , y: -4.4000000059604645 }, r:      5.5                                                              },
            { kind:   'XYRR', c: { x:   0.09999999403953552, y:  0                  }, r: { x: 3                , y: 1                 }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                  }, r: { x: 2.100000023841858, y: 2.100000023841858 }, t: 1.2566370567545795 },
        ]},
    )
    chk("tCqpCpCr6pCpCqM0000983cPcPg000006000004000005d00000h000004cPcPc8pCpCoPcPcPg", mixedShapes, {
        precisionSchemeId: 3,
        decoded: [
            { kind: 'Circle', c: { x:   3.2999999998137355 , y: -4.399999999906868 }, r:      5.5                                                              },
            { kind:   'XYRR', c: { x:   0.10000000009313226, y:  0                 }, r: { x: 3                , y: 1                 }                        },
            { kind:  'XYRRT', c: { x: -10                  , y: -1                 }, r: { x: 2.099999999627471, y: 2.099999999627471 }, t: 1.2566370615090632 },
        ]},
    )
})
