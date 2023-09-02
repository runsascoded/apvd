import Intersection from './intersection';
import {pi, r3, sqrt} from './math';
import {quartic} from '../quartic';
import {pp, zeroCheck} from './utils';
import {Point} from "../components/point";

export type XY = [ number, number ];
export type Polar = { r: number, t: number }
export type Center = { cx: number, cy: number }
export type RadiusVector = { theta: number } & ({ rx: number } | { ry: number })

export default class Ellipse {
    idx: number;
    name: string;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    theta: number;
    color: string;
    degrees: number;
    cos: number;
    sin: number;
    rM: number;
    rm: number;
    fd: number;
    vx1: Point;
    vy1: Point;
    vx2: Point;
    vy2: Point;
    f1: Point;
    f2: Point;

    constructor(o: { [k: string]: any }) {
        this.idx = o.idx;
        this.name = o.name;
        let theta: number | undefined, degrees: number | undefined;
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
            theta = o.theta;
            if (o.C !== o.A) {
                theta = this.theta = Math.atan(o.B / (o.A - o.C)) / 2;
            }
        }

        if (!('cx' in o)) {
            if (theta === undefined) {
                throw new Error("expected t in Ellipse ctor: " + JSON.stringify(o));
            }
            const c = Math.cos(theta);
            const s = Math.sin(theta);

            if (Math.abs(o.B) < 1e-10) {
                const {A, C, D, E, F} = o;
                this.cx = -D / 2 / A;
                this.cy = -E / 2 / C;
                const n = -4 * F + D * D / A + E * E / C;
                this.rx = sqrt(n / A) / 2;
                this.ry = sqrt(n / C) / 2;

            } else {
                const e = this.rotate(-theta);
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
                degrees = o.degrees;
            } else {
                theta = o.theta
            }
        }

        this.color = o.color;

        if (theta === undefined) {
            if (degrees === undefined) {
                throw new Error("expected degrees in Ellipse ctor: " + JSON.stringify(o));
            }
            theta = degrees * pi / 180;
        }
        if (degrees === undefined) {
            if (theta === undefined) {
                throw new Error("expected theta in Ellipse ctor: " + JSON.stringify(o));
            }
            degrees = 180 * theta / pi;
        }
        this.theta = theta
        this.degrees = degrees

        this.cos = Math.cos(this.theta);
        this.sin = Math.sin(this.theta);

        const { cx, cy, rx, ry, cos, sin, } = this;

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

        this.fd = sqrt(this.rM*this.rM - this.rm*this.rm);
        const fr = this.fd / this.rM;

        this.vx1 = { x: cx + rx*cos, y: cy + rx*sin }
        this.vy1 = { x: cx - ry*sin, y: cy + ry*cos }

        this.vx2 = { x: 2*cx - this.vx1.x, y: 2*cy - this.vx1.y }
        this.vy2 = { x: 2*cx - this.vy1.x, y: 2*cy - this.vy1.y }

        this.f1 ={
            x: cx + fr*(((rx >= ry) ? this.vx1.x : this.vy1.x) - cx),
            y: cy + fr*(((rx >= ry) ? this.vx1.y : this.vy1.y) - cy),
        };
        this.f2 = {
            x: cx - fr*(((rx >= ry) ? this.vx1.x : this.vy1.x) - cx),
            y: cy - fr*(((rx >= ry) ? this.vx1.y : this.vy1.y) - cy),
        }
    }

    toString() {
        return "E(c:" + pp(this.cx, this.cy) +
            "; r:" + pp(this.rx, this.ry) + "," +
            r3(this.degrees) +
            "°,(" + [this.A, this.B, this.C, this.D, this.E, this.F].map(r3).join(",") + "))";
    }

    s() {
        return this.toString();
    }

    modify(o: Center | RadiusVector): Ellipse {
        const { rx, ry, theta, cx, cy, color, idx, name } = this;
        return new Ellipse({ ...{ rx, ry, theta, cx, cy, color, idx, name }, ...o });
    }

    polar(x: number, y: number): Polar {
        const p = this.transform(x, y);
        const r = sqrt(p[0] * p[0] + p[1] * p[1]);
        //console.log("transformed:", pp(x,y), "→", pp(p), "r:", r, "p[0]/r:", p[0]/r);
        if (r === 0) return { r: r, t: 0 };
        // var atan = (p[0] == 0) ?
        const t = (p[1] < 0) ? -Math.acos(p[0] / r) : Math.acos(p[0] / r);
        //console.log("polar:", pp(x,y), pp(r,t));
        return { r: r, t: t };
    }

    transform(x: number | XY | Point, y?: number): XY {
        if (x instanceof Array) {
            y = x[1];
            x = x[0];
        } else if (typeof x === 'object' && 'x' in x) {
            y = x.y;
            x = x.x;
        } else if (y === undefined) {
            throw new Error("expected y in Ellipse.transform: " + JSON.stringify(x));
        }
        x -= this.cx;
        y -= this.cy;
        return [
            (this.cos*x + this.sin*y) / this.rx,
            (this.cos*y - this.sin*x) / this.ry
        ];
    }

    /**
     * Map a unit circle point to a point on this ellipse.
     */
    invert(x: number | XY, y?: number): XY {
        if (x instanceof Array) {
            y = x[1];
            x = x[0];
        } else if (y === undefined) {
            throw new Error("expected y in Ellipse.invert: " + JSON.stringify(x));
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

    translate(tx: number, ty: number): Ellipse {
        const {A, B, C, D, E, F, theta, color, idx, name} = this;
        return new Ellipse({
            A: A,
            B: B,
            C: C,
            D: D - 2 * A * tx - B * ty,
            E: E - 2 * C * ty - B * tx,
            F: F + A * tx * tx + B * tx * ty + C * ty * ty - D * tx - E * ty,
            theta, color, idx, name,
        });
    }

    /**
     * Rotate this ellipse around the origin (0,0)
     */
    rotate(t: number): Ellipse {
        const {A, B, C, D, E, F, theta, color, idx, name,} = this;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const c2 = c * c;
        const s2 = s * s;
        const cs = c * s;
        return new Ellipse({
            A: A*c2 - B*cs + C*s2,
            B: 2*cs*(A-C) + B*(c2 - s2),
            C: C*c2 + B*cs + A*s2,
            D: D*c - E*s,
            E: D*s + E*c,
            F: F,
            theta: theta + t,
            color, idx, name,
        });
    }

    /**
     * Scale this ellipse by { sx, sy }.
     */
    scale(sx: number, sy: number): Ellipse {
        const {A, B, C, D, E, F, theta, color, idx, name} = this;
        return new Ellipse({
            A: A / sx / sx,
            B: B / sx / sy,
            C: C / sy / sy,
            D: D / sx,
            E: E / sy,
            F: F,
            theta, color, idx, name,
        });
    }

    /**
     * Apply a linear transform to this ellipse.
     */
    affine(sx: number, sy: number, theta: number, tx: number, ty: number): Ellipse {
        return this.translate(tx, ty).rotate(theta).scale(sx, sy);
    }

    /**
     * Project this ellipse into a plane where the provided ellipse is a unit circle.
     */
    project(e: Ellipse): Ellipse {
        return this.affine(1/e.rx, 1/e.ry, -e.theta, -e.cx, -e.cy);
    }

    /**
     * Get a point on the ellipse at angle `degrees`°
     */
    getDegrees(degrees: number): XY {
        return this.getPoint(degrees * pi / 180);
    }

    /**
     * Get a point on the ellipse at angle `theta` (radians)
     */
    getPoint(theta: number): XY {
        return this.invert(Math.cos(theta), Math.sin(theta));
    }

    containsEllipse(e: Ellipse) {
        return this.contains(e.vx1) && this.contains(e.vx2) && this.contains(e.vy1) && this.contains(e.vy2);
    }

    contains(px: number | Point | XY, py?: number) {
        if (px instanceof Array) {
            py = px[1];
            px = px[0];
        } else if (typeof px === 'object' && 'x' in px) {
            py = px.y;
            px = px.x;
        } else if (py === undefined) {
            throw new Error("expected y in Ellipse.contains: " + JSON.stringify(px));
        }
        const [x, y] = this.transform(px, py);
        const r2 = x * x + y * y;
        return r2 <= 1;
    }

    intersect(e: Ellipse): Intersection[] {
        const e1 = this;
        const e2 = e;
        const p1 = e1.project(e2);
        const uis = p1.unitIntersections();

        return uis.map(ui => {
            const [c2, s2] = ui;
            const [x, y] = e2.invert(c2, s2);
            return new Intersection({ e1, e2, x, y, c2, s2 });
        });
    }

    unitIntersections(): XY[] {
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
        const xo = new Map<number, number>();
        xs.forEach((x: number) => { xo.set(x, (xo.get(x) || 0) + 1); })

        //console.log("xo:", xo);

        //var rxs = [];
        //var ys = [];
        const ps: XY[] = [];
        xo.forEach((n, x) => {
            let y = sqrt(1 - x * x);
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
