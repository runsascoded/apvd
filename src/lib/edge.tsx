
import React from 'react';
import { tpi, pp, pd, pi, pc, deg } from './utils';
import Ellipse, {XY} from "./ellipse";
import Intersection, {CST} from "./intersection";

export default class Edge {
    e: Ellipse
    i: number
    j: number
    rx: number
    ry: number
    t: number
    p1: Intersection
    x1: number
    y1: number
    o1: CST
    t1: number
    p2: Intersection
    x2: number
    y2: number
    o2: CST
    t2: number
    n: number
    ps: [Intersection, Intersection]
    mt: number
    mp: XY
    dt: number
    sector: number
    triangle: number
    secant: number
    expectedEdgeVisits: number = 0
    containers: boolean[] = []
    prev?: Edge
    next?: Edge

    constructor(o: { [key: string]: any }) {
        this.e = o.e;
        this.i = this.e.idx;
        this.j = o.j;
        this.rx = this.e.rx;
        this.ry = this.e.ry;
        this.t = this.e.t;

        this.p1 = o.p1;
        this.x1 = this.p1.x;
        this.y1 = this.p1.y;
        this.o1 = this.p1.cst(this.i)
        this.t1 = this.o1.t;
        this.p1.addEdge(this);

        this.p2 = o.p2;
        this.x2 = this.p2.x;
        this.y2 = this.p2.y;
        this.o2 = this.p2.cst(this.i)
        this.t2 = this.o2.t;
        if (this.p2 !== this.p1) {
            this.p2.addEdge(this);
        }

        this.n = 0;
        this.ps = [ this.p1, this.p2 ];

        this.mt = (this.t1 + this.t2 + (this.t2 < this.t1 ? tpi : 0)) / 2;
        this.mp = this.e.getPoint(this.mt);

        this.dt = this.t2 - this.t1;
        if (this.p1 === this.p2) {
            this.dt = tpi;
        } else if (this.dt < 0) {
            this.dt += tpi;
        }

        this.sector = this.rx * this.ry * this.dt / 2;
        this.triangle = this.rx * this.ry * Math.sin(this.dt) / 2;
        this.secant = this.sector - this.triangle;

        //console.log(
        //      this.s(),
        //      r3(this.sector), r3(this.triangle), r3(this.secant),
        //      pd(this.dt), pd(this.t1), pd(this.t2)
        //);

        //console.log(this.toString())
        // this.containers = [];
    }

    // hasContainers(containers) {
    //     for (let c in containers) {
    //         if (!(c in this.containers) && c !== this.i) return false;
    //     }
    //     return true;
    // }

    other(p: Intersection): Intersection {
        if (p === this.p1) return this.p2;
        if (p === this.p2) return this.p1;
        throw new Error("Invalid p: " + p.toString() + " in " + this.toString());
    }

    get ellipses(): boolean[] {
        const o = [...this.containers]
        o[this.i] = true;
        return o;
    }

    toString() {
        const pp1 = pp(this.x1, this.y1);
        const pp2 = pp(this.x2, this.y2);
        return `"Edge(${this.i}: ${pp1} → ${pp2}, ${pd(this.t1)}→${pd(this.t2)}, ${pp(this.mp)})`
    }

    s() {
        return "E(" + this.i + ":" + pp(this.x1,this.y1) + "," + pp(this.x2, this.y2) + ")";
    }

    arcpath(from: Intersection) {
        const {rx, ry, e} = this;

        const to = this.other(from);
        const [xt,yt] = [to.x, to.y];

        const largeArc = (this.dt > pi) ? 1 : 0;
        const sweepFlag = (from === this.p1) ? 1 : 0;
        return [
            "A" + pc(rx, ry),
            deg(e.t),
            pc(largeArc, sweepFlag),
            pc(xt, yt)
        ].join(' ');
    }

    path(from: Intersection) {
        return "M" + pc(from.x, from.y) + " " + this.arcpath(from);
    }

    elem(i: string, width: number) {
        return <path
            key={i}
            d={this.path(this.p1)}
            stroke={this.e.color}
            strokeWidth={width}
            className="edge"
            fill={this.e.color}
        />;
    }
}
