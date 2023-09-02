
import { cmp } from './lib/utils';
import {pi, sqrt} from "./lib/math";

export const cubic = (a: number, b: number, c?: number, d?: number): number[] => {
    if (d !== undefined) {
        if (c === undefined) {
            throw new Error("cubic: d is defined but c is not")
        }
        if (a === 0) {
            let D = c*c - 4*b*d;
            //console.log("quadratic:", b, c, d, " ", D);
            if (D < 0 && D > -1e-14) {
                D = 0;
            }
            if (D >= 0) {
                const sqD = sqrt(D);
                return [ (-c + sqD) / 2 / b, (-c - sqD) / 2 / b ];
            }
            return [];
        }
        return cubic(b/a, c/a, d/a);
    }

    if (c !== undefined) {
        const p = b - a*a/3;
        const q = c - a*b/3 + 2*a*a*a/27;
        return cubic(p, q).map((x) => { return x - a/3; });
    }

    const p = a;
    const q = b;

    if (q === 0) {
        if (p < 0) {
            return [ -sqrt(-p), 0, sqrt(-p) ];
        }
        return [ 0 ];
    } else if (p === 0) {
        return [ Math.cbrt(-q) ];
    }
    const p3 = -p/3;
    const p33 = p3*p3*p3;
    const q2 = -q/2;
    const q22 = q2*q2;

    const r = q22 - p33;
    //console.log("cubic:", p, q, r);

    function tk(k: number) {
        return 2 * sqrt(p3) * Math.cos((Math.acos(q2/sqrt(p33)) - 2*pi*k) / 3);
    }
    if (r < 0) {
        const roots = [ tk(0), tk(1), tk(2) ];
        roots.sort(cmp);
        return roots;
    } else {

        if (r === 0) {
            return [ 3*q/p, -q2/p3, -q2/p3 ].sort(cmp);
        } else {
            const sqr = sqrt(r);
            //console.log("sq:", sq);
            return [ Math.cbrt(q2 + sqr) + Math.cbrt(q2 - sqr) ];
        }
    }
};
