import { toBeDeepCloseTo,toMatchCloseTo } from 'jest-matcher-deep-close-to';
expect.extend({toBeDeepCloseTo, toMatchCloseTo});

import Ellipses, {regionString} from '../src/lib/ellipses'
import Ellipse from '../src/lib/ellipse'

const ellipses = [
    {
        name: "A", color: 'red',
        cx: -0.82, cy: 0.38,
        rx: 1, ry: 2,
        degrees: 0,
    },
    {
        name: "B", color: 'blue',
        cx: -0.7, cy: 0.12,
        rx: 1.3, ry: 0.4,
        degrees: 114,
    },
    {
        name: "C", color: 'darkgoldenrod',
        cx: 0.5, cy: 1.52,
        rx: .94, ry: .48,
        degrees: 18,
    },
    {
        name: "D", color: 'green',
        cx: 0, cy: 0,
        rx: .6, ry: .48,
        degrees: -44,
    }
].map(e => new Ellipse(e))

describe('test Ellipses', () => {
    test('basic ctor', () => {
        expect(ellipses.length).toBe(4)
        const e = new Ellipses(ellipses);
        expect(e.intersections.map(i => i.s())).toEqual([
            "I(0.134,0.979)",
            "I(-0.095,1.757)",
            "I(0.179,0.46)",
            "I(0.068,-0.539)",
            "I(-0.408,0.439)",
            "I(-0.083,-0.504)",
        ])
        expect(e.edges.map(e => e.s())).toEqual([
            "E(A:(0.068,-0.539),(0.179,0.46))",
            "E(A:(0.179,0.46),(0.134,0.979))",
            "E(A:(0.134,0.979),(-0.095,1.757))",
            "E(A:(-0.095,1.757),(0.068,-0.539))",
            "E(B:(-0.083,-0.504),(-0.408,0.439))",
            "E(B:(-0.408,0.439),(-0.083,-0.504))",
            "E(C:(0.134,0.979),(-0.095,1.757))",
            "E(C:(-0.095,1.757),(0.134,0.979))",
            "E(D:(-0.083,-0.504),(0.068,-0.539))",
            "E(D:(0.068,-0.539),(0.179,0.46))",
            "E(D:(0.179,0.46),(-0.408,0.439))",
            "E(D:(-0.408,0.439),(-0.083,-0.504))",
        ])
        expect(e.regions.map(r => regionString(r))).toEqual([
            "[0.134,0.979 0→ -0.095,1.757 2→]",
            "[0.134,0.979 0→ -0.095,1.757 2→]",
            "[0.134,0.979 2→ -0.095,1.757 0→ 0.068,-0.539 3→ -0.083,-0.504 1→ -0.408,0.439 3→ 0.179,0.46 0→]",
            "[0.179,0.46 0→ 0.068,-0.539 3→ -0.083,-0.504 1→ -0.408,0.439 3→]",
            "[0.179,0.46 0→ 0.068,-0.539 3→]",
            "[-0.408,0.439 1→ -0.083,-0.504 3→]",
            "[-0.408,0.439 1→ -0.083,-0.504 3→]",
        ])
    })
    test('project', () => {
        const [ e0, e2 ] = [ellipses[0], ellipses[2]];
        const e2p = e2.project(e0)
        expect([e2p.cx, e2p.cy]).toBeDeepCloseTo([ 1.32, 0.57 ], 5)
    })
    test('project 2', () => {
        const [ e0, e2 ] = [ellipses[0], ellipses[2]];
        const e2t = e2.translate(1, 1)
        expect([e2t.cx, e2t.cy]).toBeDeepCloseTo([ 1.5, 2.52 ], 5)
        const e2pt = e2t.project(e0)
        expect([e2pt.cx, e2pt.cy]).toBeDeepCloseTo([ 2.32, 1.07 ], 5)
    })
    test("edge visits", () => {
        const ellipses: Ellipse[] = [
            {
                name: "A", color: 'red',
                cx: 0, cy: 0,
                rx: 1, ry: 2,
                degrees: 0,
            },
            {
                name: "B", color: 'blue',
                cx: 0, cy: 1,
                rx: 2, ry: 2,
                degrees: 0,
            },
            {
                name: "C", color: 'darkgoldenrod',
                cx: 0, cy: -1,
                rx: 2, ry: 2,
                degrees: 0,
            },
            {
                name: "D", color: 'green',
                cx: 0, cy: 0,
                rx: .5, ry: .5,
                degrees: 0,
            },
        ].map(e => new Ellipse(e))
        const e = new Ellipses(ellipses);
        expect(e.intersections.map(i => i.s())).toEqual([
            "I(-0.922,-0.775)",
            "I(0.922,-0.775)",
            "I(-0.922,0.775)",
            "I(0.922,0.775)",
            "I(1.732,0)",
            "I(-1.732,0)",
            "I(0.5,0)",
        ])
        expect(e.edges.map(e => e.s())).toEqual([
            "E(A:(-0.922,-0.775),(0.922,-0.775))",
            "E(A:(0.922,-0.775),(0.922,0.775))",
            "E(A:(0.922,0.775),(-0.922,0.775))",
            "E(A:(-0.922,0.775),(-0.922,-0.775))",
            "E(B:(-1.732,0),(-0.922,-0.775))",
            "E(B:(-0.922,-0.775),(0.922,-0.775))",
            "E(B:(0.922,-0.775),(1.732,0))",
            "E(B:(1.732,0),(-1.732,0))",
            "E(C:(1.732,0),(0.922,0.775))",
            "E(C:(0.922,0.775),(-0.922,0.775))",
            "E(C:(-0.922,0.775),(-1.732,0))",
            "E(C:(-1.732,0),(1.732,0))",
            "E(D:(0.5,0),(0.5,0))",
        ])
        expect(e.regions.map(r => regionString(r))).toEqual([
            "[-0.922,-0.775 0→ 0.922,-0.775 1→]",
            "[-0.922,-0.775 0→ 0.922,-0.775 1→ 1.732,0 2→ -1.732,0 1→]",
            "[-0.922,-0.775 0→ -0.922,0.775 2→ 0.922,0.775 0→ 0.922,-0.775 1→]",
            "[-0.922,-0.775 0→ -0.922,0.775 2→ -1.732,0 1→]",
            "[0.922,-0.775 0→ 0.922,0.775 2→ 1.732,0 1→]",
            "[-0.922,0.775 0→ 0.922,0.775 2→ 1.732,0 1→ -1.732,0 2→]",
            "[-0.922,0.775 0→ 0.922,0.775 2→]",
            "[0.5,0 3→]",
        ])
    })
});
