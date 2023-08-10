import { toBeDeepCloseTo,toMatchCloseTo } from 'jest-matcher-deep-close-to';
expect.extend({toBeDeepCloseTo, toMatchCloseTo});

import Ellipses from '../src/lib/ellipses'
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
        expect(e.intersections.length).toBe(6);
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
        const e2p = e2.project(e0)
        const e2pt = e2t.project(e0)
        expect([e2p.cx, e2p.cy]).toBeDeepCloseTo([ 2.32, 1.07 ], 5)
    })
});
