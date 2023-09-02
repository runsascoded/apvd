import Edge from "./edge";
import {Point} from "../components/point";
import {XY} from "./ellipse";
import {r3} from "./math";

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

export const zeroCheck = (n: number) => (Math.abs(n) < 1e-13) ? 0 : n;

export const keyStr = (o: { [k: string]: any } | any[], sep?: string) => {
    const ks: string[] = [];
    Object.entries(o).forEach(([ k, v ]) => {
        if (v !== undefined) {
            ks.push(k)
        }
    })
    return ks.join(sep || ",");
};

export const eqSet = <T>(as: Set<T>, bs: Set<T>) => {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
};

export const intersect = (a: boolean[], b: boolean[]): [ boolean[], boolean[], boolean[] ] => {
    const intersection: boolean[] = [];
    const aMinusB: boolean[] = [];
    const bMinusA: boolean[] = [];
    for (const k in b) {
        if (!b[k]) continue;
        if (a[k]) {
            intersection[k] = a[k];
        } else {
            bMinusA[k] = b[k];
        }
    }
    for (const k in a) {
        if (a[k] && !b[k]) {
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
