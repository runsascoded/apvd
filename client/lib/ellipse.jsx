
Ellipse = class {
  constructor(o) {

    if ('A' in o) {
      this.A = o.A;
      this.B = o.B;
      this.C = o.C;
      this.D = o.D;
      this.E = o.E;
      this.F = o.F;
      var t = o.t;
      if (o.C != o.A) {
        t = Math.atan(o.B / (o.A - o.C)) / 2;
      }
      this.theta = t;
    }

    if (!('cx' in o)) {

      var c = Math.cos(t);
      var s = Math.sin(t);

      if (Math.abs(o.B) < 1e-10) {

        var c2 = c*c;
        var s2 = s*s;

        var {A, B, C, D, E, F} = o;
        this.cx = -D / 2 / A;
        this.cy = -E / 2 / C;
        var n = -4*F + D*D/A + E*E/C;
        this.rx = Math.sqrt(n / A) / 2;
        this.ry = Math.sqrt(n / C) / 2;

      } else {
        var e = this.rotate(-t);
        var {cx, cy} = e;
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


    var {cx, cy, rx, ry, cos, sin} = this;

    if (!('A' in o)) {
      var rx2 = rx*rx;
      var ry2 = ry*ry;
      var c = cos;
      var s = sin;
      var c2 = c*c;
      var s2 = s*s;

      var d1 = ry*(cx*c + cy*s);
      var d2 = rx*(cy*c - cx*s);
      var d = rx2*ry2 - d1*d1 - d2*d2;

      var a1 = c2*ry2 + s2*rx2;
      var c1 = c2*rx2 + s2*ry2;

      var r1 = ry2 - rx2;

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

    this.fd = Math.sqrt(this.rM*this.rM - this.rm*this.rm);
    var fr = this.fd / this.rM;

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
    var rX = this.rx * x;
    var rY = this.ry * y;
    var X = this.cos*rX - this.sin*rY;
    var Y = this.cos*rY + this.sin*rX;
    return [
      X + this.cx,
      Y + this.cy
    ];
  }

  translate(tx, ty) {
    var {A, B, C, D, E, F} = this;
    var e = new Ellipse({
      A: A,
      B: B,
      C: C,
      D: D - 2*A*tx - B*ty,
      E: E - 2*C*ty - B*tx,
      F: F + A*tx*tx + B*tx*ty + C*ty*ty - D*tx - E*ty,
      t: this.t,
      color: this.color
    });

    return e;
  }

  rotate(t, x, y) {
    var {A, B, C, D, E, F} = this;
    var c = Math.cos(t);
    var s = Math.sin(t);
    var c2 = c*c;
    var s2 = s*s;
    var cs = c*s;

    var e = this;
    if (x || y) {
      x = x || 0;
      y = y || 0;
      e = this.translate(-x, -y);
    }

    e = new Ellipse({
      A: A*c2 - B*cs + C*s2,
      B: 2*cs*(A-C) + B*(c2 - s2),
      C: C*c2 + B*cs + A*s2,
      D: D*c - E*s,
      E: D*s + E*c,
      F: F,
      t: this.t + t,
      color: this.color
    });

    if (x || y) {
      e = e.translate(x, y);
    }

    return e;
  }

  scale(sx, sy) {
    var {A, B, C, D, E, F} = this;
    return new Ellipse({
      A: A/sx/sx,
      B: B/sx/sy,
      C: C/sy/sy,
      D: D/sx,
      E: E/sy,
      F: F,
      t: this.t,
      color: this.color
    });
  }

  affine(sx, sy, t, tx, ty) {
    return this.translate(tx, ty).rotate(t).scale(sx, sy);
  }

  modify(fields) {
    _.forEach(fields, (v,k) => { this[k] = v; });
    return new Ellipse({
      rx: this.rx,
      ry: this.ry,
      degrees: this.degrees,
      theta: this.theta,
      cx: this.cx,
      cy: this.cy,
      color: this.color
    });
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

  intersect(e) {
    var p = this.project(e);
    var uis = p.unitIntersections();
    var ret = uis.map(this.invert);
    //console.log("projected:", p.s());
    //console.log("unit intxs:", uis.map((p) => { return p.join(","); }));
    //console.log("inverted:", ret.map((p) => { return p.join(","); }));

    return ret;
    //return this.project(e).unitIntersections().map(this.invert);
  }

  unitIntersections() {
    var {A, B, C, D, E, F} = this;

    var B2 = B*B;
    var E2 = E*E;
    var BE = B*E;
    var AC = A - C;
    var CF = C + F;

    var c4 = AC*AC + B2;
    var c3 = 2*D*AC + 2*BE;
    var c2 = D*D + 2*AC*CF + E2 - B2;
    var c1 = 2*D*CF - 2*BE;
    var c0 = CF*CF - E2;

    //console.log("ceoffs:", c4,c3,c2,c1,c0);

    var xs = quartic(c4, c3, c2, c1, c0);

    var ys = xs.map((x) => {
      var y = Math.sqrt(1 - x*x);
      var b = A*x*x + C*y*y + D*x + F;
      var c = B*x*y + E*y;
      var r1 = b + c;
      var r2 = b - c;

      if (Math.abs(r2) < Math.abs(r1)) {
        return -y;
      }
      //console.log("\t", pp(x,r1),pp(x,r2));

      return y;
    });
    var ps = xs.map((x, i) => { return [ x, ys[i] ]; });

    //console.log("unit:", this.toString(), "coeffs:", [c4,c3,c2,c1,c0].map(r3), "xs:", xs.map(r3), "ps:", pps(ps));
    return ps;
  }
};
