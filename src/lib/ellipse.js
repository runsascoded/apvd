
import _ from 'underscore';
import { zeroCheck, pi, sq, pp, r3 } from './utils';
import Intersection from './intersection';
import { quartic } from '../quartic';

export default class Ellipse {
    constructor(o) {
        this.i = o.i;
        this.name = o.name;
        let t;
        if ('A' in o) {
            if (isNaN(o.A)) {
                throw new Error("Bad ellipse ctor: " + JSON.stringify(o));
            }
            this.A = o.A;
            this.B = o.B;
            this.C = o.C;
            this.D = o.D;
            this.E = o.E;
            this.F = o.F;
            t = o.t;
            if (o.C !== o.A) {
                t = Math.atan(o.B / (o.A - o.C)) / 2;
            }
            this.theta = t;
            this.t = t;
        }

        if (!('cx' in o)) {

            if (t === undefined) {
                throw new Error("expected t in Ellipse ctor: " + JSON.stringify(o));
            }
            const c = Math.cos(t);
            const s = Math.sin(t);

            if (Math.abs(o.B) < 1e-10) {

                const {A, C, D, E, F} = o;
                this.cx = -D / 2 / A;
                this.cy = -E / 2 / C;
                const n = -4 * F + D * D / A + E * E / C;
                this.rx = sq(n / A) / 2;
                this.ry = sq(n / C) / 2;

            } else {
                const e = this.rotate(-t);
                const { cx, cy } = e;
                this.rx = e.rx;
                this.ry = e.ry;
                this.cx = c*cx - s*cy;
                this.cy = s*cx + c*cy;
            }
        } else {
            this.cx = o.cx;
            this.cy = o.cy;
            this.rx = o.rx;
            this.ry = o.ry;
            if (o.degrees !== undefined) {
                this.degrees = o.degrees;
            } else {
                this.theta = o.theta;
            }
        }

        this.color = o.color;

        if (this.theta === undefined) {
            this.theta = this.degrees * pi / 180;
        }
        if (this.degrees === undefined) {
            this.degrees = 180 * this.theta / pi;
        }
        this.t = this.theta;

        this.cos = Math.cos(this.theta);
        this.sin = Math.sin(this.theta);


        const {cx, cy, rx, ry, cos, sin} = this;

        if (!('A' in o)) {
            const rx2 = rx * rx;
            const ry2 = ry * ry;
            const c = cos;
            const s = sin;
            const c2 = c*c;
            const s2 = s*s;

            const d1 = ry * (cx * c + cy * s);
            const d2 = rx * (cy * c - cx * s);
            let d = rx2 * ry2 - d1 * d1 - d2 * d2;

            const a1 = c2 * ry2 + s2 * rx2;
            const c1 = c2 * rx2 + s2 * ry2;

            const r1 = ry2 - rx2;

            this.A = a1;
            this.B = 2*c*s*r1;
            this.C = c1;
            this.D = -2 * (cx*a1 + cy*c*s*r1);
            this.E = -2 * (cy*c1 + cx*c*s*r1);
            this.F = -d;
        } else {
            this.A = o.A;
            this.B = o.B;
            this.C = o.C;
            this.D = o.D;
            this.E = o.E;
            this.F = o.F;
        }

        this.rM = Math.max(rx, ry);
        this.rm = Math.min(rx, ry);

        this.fd = sq(this.rM*this.rM - this.rm*this.rm);
        const fr = this.fd / this.rM;

        this.vxx = cx + rx*cos;
        this.vxy = cy + rx*sin;
        this.vx = [ this.vxx, this.vxy ];

        this.vyx = cx - ry*sin;
        this.vyy = cy + ry*cos;
        this.vy = [ this.vyx, this.vyy ];

        this.vx2 = [ 2*cx - this.vxx, 2*cy - this.vxy ];
        this.vy2 = [ 2*cx - this.vyx, 2*cy - this.vyy ];

        this.f1x = cx + fr*(((rx >= ry) ? this.vxx : this.vyx) - cx);
        this.f1y = cy + fr*(((rx >= ry) ? this.vxy : this.vyy) - cy);
        this.f1 = [ this.f1x, this.f1y ];

        this.f2x = cx - fr*(((rx >= ry) ? this.vxx : this.vyx) - cx);
        this.f2y = cy - fr*(((rx >= ry) ? this.vxy : this.vyy) - cy);
        this.f2 = [ this.f2x, this.f2y ];
    }

    toString() {
        return "E(c:" + pp(this.cx, this.cy) +
            "; r:" + pp(this.rx, this.ry) + "," +
            r3(this.degrees) +
            "°,(" + [this.A,this.B,this.C,this.D,this.E,this.F].map(r3).join(",") + "))";
    }

    s() {
        return this.toString();
    }

    polar(x, y) {
        const p = this.transform(x, y);
        const r = sq(p[0] * p[0] + p[1] * p[1]);
        //console.log("transformed:", pp(x,y), "→", pp(p), "r:", r, "p[0]/r:", p[0]/r);
        if (r === 0) return { r: r, t: 0 };
        // var atan = (p[0] == 0) ?
        const t = (p[1] < 0) ? -Math.acos(p[0] / r) : Math.acos(p[0] / r);
        //console.log("polar:", pp(x,y), pp(r,t));
        return { r: r, t: t };
    }

    transform(x, y) {
        if (x instanceof Array) {
            y = x[1];
            x = x[0];
        } else if (typeof x === 'object' && 'x' in x) {
            y = x.y;
            x = x.x;
        }
        x -= this.cx;
        y -= this.cy;
        return [
            (this.cos*x + this.sin*y) / this.rx,
            (this.cos*y - this.sin*x) / this.ry
        ];
    }

    invert(x, y) {
        if (x instanceof Array) {
            y = x[1];
            x = x[0];
        }
        const rX = this.rx * x;
        const rY = this.ry * y;
        const X = this.cos * rX - this.sin * rY;
        const Y = this.cos * rY + this.sin * rX;
        return [
            X + this.cx,
            Y + this.cy
        ];
    }

    translate(tx, ty) {
        const {A, B, C, D, E, F} = this;
        const e = new Ellipse({
            A: A,
            B: B,
            C: C,
            D: D - 2 * A * tx - B * ty,
            E: E - 2 * C * ty - B * tx,
            F: F + A * tx * tx + B * tx * ty + C * ty * ty - D * tx - E * ty,
            t: this.t,
            color: this.color,
            i: this.i,
            name: this.name
        });

        return e;
    }

    rotate(t, x, y) {
        const {A, B, C, D, E, F} = this;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const c2 = c * c;
        const s2 = s * s;
        const cs = c * s;

        let e;
        if (x || y) {
            x = x || 0;
            y = y || 0;
        }

        e = new Ellipse({
            A: A*c2 - B*cs + C*s2,
            B: 2*cs*(A-C) + B*(c2 - s2),
            C: C*c2 + B*cs + A*s2,
            D: D*c - E*s,
            E: D*s + E*c,
            F: F,
            t: this.t + t,
            color: this.color,
            i: this.i,
            name: this.name
        });

        if (x || y) {
            e = e.translate(x, y);
        }

        return e;
    }

    scale(sx, sy) {
        const {A, B, C, D, E, F} = this;
        return new Ellipse({
            A: A / sx / sx,
            B: B / sx / sy,
            C: C / sy / sy,
            D: D / sx,
            E: E / sy,
            F: F,
            t: this.t,
            color: this.color,
            i: this.i,
            name: this.name
        });
    }

    affine(sx, sy, t, tx, ty) {
        return this.translate(tx, ty).rotate(t).scale(sx, sy);
    }

    modify(fields) {
        _.forEach(
            fields,
            (v, k) => {
                this[k] = v;
            });

        const { rx, ry, degrees, theta, cx, cy, color, i, name } = this;

        return new Ellipse({ rx, ry, degrees, theta, cx, cy, color, i, name });
    }

    project(e) {
        return this.affine(1/e.rx, 1/e.ry, -e.t, -e.cx, -e.cy);
    }

    getDegrees(d) {
        return this.getPoint(d * pi / 180);
    }

    getPoint(t) {
        return this.invert(Math.cos(t), Math.sin(t));
    }

    containsEllipse(e) {
        return this.contains(e.vx);
    }

    contains(px, py) {
        if (px instanceof Array) {
            py = px[1];
            px = px[0];
        } else if (typeof px === 'object' && 'x' in px) {
            py = px.y;
            px = px.x;
        }
        const [x, y] = this.transform(px, py);
        const r2 = x * x + y * y;
        //console.log("\tchecking containment:", pp(px, py), pp(x,y), r2);
        return r2 <= 1;
    }

    intersect(e) {
        const e1 = this;
        const e2 = e;
        const p1 = e1.project(e2);
        //console.log("e1:", e1.toString(), "e2:", e2.toString(), "p1:", p1.toString());
        const uis = p1.unitIntersections();

        //console.log("uis:", uis);
        const ret = uis.map(ui => {
            const [c2, s2] = ui;
            const [x, y] = e2.invert(c2, s2);
            //console.log("ui:", pp(ui), "xy:", pp(x,y), "cs2:", pp(c2, s2));

            return new Intersection({ e1, e2, x, y, c2, s2 });
        });

        //console.log("projected:", p.s());
        //console.log("unit intxs:", uis.map((p) => { return p.join(","); }));
        //console.log("inverted:", ret.map((p) => { return p.join(","); }));

        return ret;
        //return this.project(e).unitIntersections().map(this.invert);
    }

    unitIntersections() {
        const {A, B, C, D, E, F} = this;

        const B2 = B * B;
        const E2 = E * E;
        const BE = B * E;
        const AC = A - C;
        const CF = C + F;

        let c4 = AC * AC + B2;
        let c3 = 2 * D * AC + 2 * BE;
        let c2 = D * D + 2 * AC * CF + E2 - B2;
        let c1 = 2 * D * CF - 2 * BE;
        let c0 = CF * CF - E2;

        [c4, c3, c2, c1, c0] = [c4, c3, c2, c1, c0].map(zeroCheck);

        //console.log("coeffs:", c4,c3,c2,c1,c0);

        const xs = quartic(c4, c3, c2, c1, c0);
        //console.log("quartic:", xs);
        const xo = {};
        xs.forEach((x) => {
            xo[x] = (xo[x] || 0) + 1;
        });

        //console.log("xo:", xo);

        //var rxs = [];
        //var ys = [];
        const ps = [];
        _.forEach(xo, (n, x) => {
            let y = sq(1 - x * x);
            if (isNaN(y)) return;
            const b = A * x * x + C * y * y + D * x + F;
            const c = B * x * y + E * y;
            const r1 = Math.abs(b + c);
            const r2 = Math.abs(b - c);

            //console.log("x:", x, "n:", n, "rs:", r1, r2, r1 - r2);
            if (n > 1) {
                //console.log("pushing double:", y, -y);
                ps.push([x, -y]);
                ps.push([x, y]);
            } else if (r2 < r1) {
                ps.push([x, -y]);
            } else {
                ps.push([x, y]);
            }
            //console.log("\t", pp(x,r1),pp(x,r2));
        });

        //console.log("unit:", this.toString(), "coeffs:", [c4,c3,c2,c1,c0].map(r3), "xs:", xs.map(r3), "ps:", pps(ps));
        return ps;
    }
}
