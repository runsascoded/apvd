
import { pp, r3, deg } from './utils';
import Ellipse from "./ellipse";
import Edge from "./edge";

export type CST = {
    c: number
    s: number
    t: number
    prev?: Intersection
    next?: Intersection
}

export default class Intersection {
    e1: Ellipse
    e2: Ellipse
    cst1: CST
    cst2: CST
    x: number
    y: number
    edges: Edge[]
    idx: number | null = null

    constructor(o: { [k: string]: any }) {
        this.e1 = o.e1;
        this.e2 = o.e2;
        const {e1, e2} = o;

        const t1 = o.t1 === undefined ? e1.polar(o.x, o.y).t : o.t1;
        this.cst1 = {
            t: t1,
            c: o.c1 === undefined ? Math.cos(t1) : o.c1,
            s: o.s1 === undefined ? Math.sin(t1) : o.s1,
        }
        const t2 = o.t2 === undefined ? e2.polar(o.x, o.y).t : o.t2;
        this.cst2 = {
            t: t2,
            c: o.c2 === undefined ? Math.cos(t2) : o.c2,
            s: o.s2 === undefined ? Math.sin(t2) : o.s2,
        }

        if (o.x === undefined) {
            const [x, y] = e1.invert(this.cst1.c, this.cst1.s);
            this.x = x;
            this.y = y;
        } else {
            this.x = o.x;
            this.y = o.y;
        }
        this.edges = [];
    }

    polar(ellipseIdx: number) {
        if (ellipseIdx == this.e1.idx) return this.cst1
        if (ellipseIdx == this.e2.idx) return this.cst2
        throw new Error(`Ellipse idx ${ellipseIdx} not found in ${this.e1.idx}, ${this.e2.idx} (${this.toString()})`)
    }

    addEdge(edge: Edge) {
        this.edges.push(edge);
    }

    other(e: Ellipse): Ellipse {
        if (e === this.e1) return this.e2;
        if (e === this.e2) return this.e1;
        throw new Error("Bad other ellipse req: " + e.toString() + " in " + this.toString());
    }

    toString() {
        return "I(" + [
                pp(this.x, this.y),
                pp(this.cst1.c, this.cst1.s),
                pp(this.cst2.c, this.cst2.s),
                r3(deg(this.cst1.t)),
                r3(deg(this.cst2.t))
            ].join(" ") +
            ")";
    }

    s() {
        return "I" + pp(this.x, this.y);
    }
}
