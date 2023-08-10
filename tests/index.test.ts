import Ellipses from '../src/lib/ellipses'
import Ellipse from '../src/lib/ellipse'

describe('test Ellipses', () => {
    test('basic ctor', () => {
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
        expect(ellipses.length).toBe(4)
        const e = new Ellipses(ellipses);
        // expect(e.intersections.length).toBe(0);
    });
});
