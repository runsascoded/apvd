
// import _ from 'underscore';

import Edge from "./edge";
import {Point} from "../components/point";
import {XY} from "./ellipse";

export const pi = Math.PI;

export const pi4 = pi / 4;
export const tpi = 2 * pi;

export const cmp = (a: number, b: number) => a - b;

export const pp = (p: number | XY, q?: number) => {
    if (p instanceof Array) {
        [ p, q ] = p
    } else if (q === undefined) {
        throw new Error(`pp: ${p} ${q}`)
    }
    return `(${[p, q].map(r3).join(',')})`;
}
export const pc = (p: any, q: any) => `${p},${q}`;
export const pps = (a: any[]) => a.map(pp).join(" ");
export const cpps = (a: any[]) => {
    console.log(pps(a));
};

export const deg = (t: number) => 180 * t / pi;
export const rad = (d: number) => pi * d / 180;

export const pd = (t: number) => r3(deg(t)) + "°";

export const zeroCheck = (n: number) => (Math.abs(n) < 1e-13) ? 0 : n;

export const sqrt = Math.sqrt;
// export const sq2 = sq(2);

// export const setEntry = (arr, i1, i2, v) => {
//     if (!(i1 in arr)) {
//         arr[i1] = [];
//     }
//     arr[i1][i2] = v;
// };
//
// export const pushEntry = (arr, i1, i2, v) => {
//     if (!(i1 in arr)) {
//         arr[i1] = [];
//     }
//     const a1 = arr[i1];
//     if (!(i2 in a1)) {
//         a1[i2] = [];
//     }
//     a1[i2].push(v);
// };

export const keyStr = (o: { [k: string]: any } | any[], sep?: string) => {
    return Object.entries(o).map((v, k) => {
        return k;
    }).join(sep || ",");
};
// export const ks = keyStr;
// export const kvs = obj => _.map(
//     obj,
//     (o, i) => i + ": " + ks(o, "")
// ).join(", ");

export const eqSet = <T>(as: Set<T>, bs: Set<T>) => {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
};

// export const union = (a, b) => {
//     b.forEach(i => a.add(i));
// };

export const intersect = <T>(a: T[], b: T[]): [ T[], T[], T[] ] => {
    const intersection: T[] = [];
    const aMinusB: T[] = [];
    const bMinusA: T[] = [];
    for (const k in b) {
        if (k in a) {
            intersection[k] = a[k];
        } else {
            bMinusA[k] = b[k];
        }
    }
    for (const k in a) {
        if (!(k in b)) {
            aMinusB[k] = a[k];
        }
    }
    return [intersection, aMinusB, bMinusA];
}

export const ts = (o: any) => o.toString();
export const tss = (o: any) => o.s();

export const ss = (a: any[], sep?: string) => a.map(tss).join(sep || " ");

export const sum = (a: number, b: number) => a + b;

export const lengthCmp = (a: string, b: string) => {
    const ld = a.length - b.length;
    if (ld) return ld;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
};

export const pathStr = (points: Point[], edges: Edge[]) => {
    return '[' + points.map((p, i) => {
        return pc(r3(p.x), r3(p.y)) + " " + edges[i].i + "→";
    }).join(" ") + ']';
};
export const ps = pathStr;

export const os = (o: any) => {
    return Object.entries(o).map(([ v, k ]) => {
        return `${k}: ${Object.keys(v).join(',')}`;
    }).join(" ");
};

export const js = JSON.stringify;

export const powerset = <T>(a: T[]): T[][] => {
    if (!a.length) {
        return [[]];
    }
    const rest = powerset(a.slice(1));
    return rest.map(r => [a[0]].concat(r)).concat(rest);
};

export const spaces = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) {
        s += " ";
    }
    return s;
}

export const r3 = (x: number) => Math.round(1000 * x) / 1000;
