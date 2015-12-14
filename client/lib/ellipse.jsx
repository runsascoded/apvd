
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
    var d = this.rM;
    var d2 = d*d;
    var d4 = d2*d2;

    var f2x = this.f2x;
    var f2y = this.f2y;
    var f1x = this.f1x;
    var f1y = this.f1y;

    var S = 4*d2 + f1x*f1x + f1y*f1y + f2x*f2x + f2y*f2y;
    var S2 = S*S;
    var S4 = S2*S2;

    var dx = f1x - f2x;
    var dy = f1y - f2y;

    var dx2 = dx*dx;
    var dx4 = dx2*dx2;

    var dy2 = dy*dy;
    var dy4 = dy2*dy2;

    var f1x2 = f1x*f1x;
    var f1y2 = f1y*f1y;
    var f2x2 = f2x*f2x;
    var f2y2 = f2y*f2y;

    var c0 = -256*d4 + 128*d2*dy2 - 16*dy4 - 512*d4*f2x2 +
          128*d2*dy2*f2x2 - 256*d4*f2x2*f2x2 + 512*d4*f2y2 +
          128*d2*dy2*f2y2 - 512*d4*f2x2*f2y2 - 256*d4*f2y2*f2y2 +
          32*d2*S2 - 8*dy2*S2 + 32*d2*f2x2*S2 + 32*d2*f2y2*S2 - S4;

    var c1 = 1024*d4*f2x - 256*d2*dy2*f2x + 1024*d4*f2x2*f2x +
          1024*d4*f2x*f2y2 + 512*d2*dx*dy*f2y*S - 64*d2*f2x*S2;

    var c2 = 128*d2*dx2 - 128*d2*dy2 - 32*dx2*dy2 + 32*dy4 -
          1024*d4*f2x2 + 128*d2*dx2*f2x2 - 128*d2*dy2*f2x2 -
          1024*d4*f2y2 + 128*d2*dx2*f2y2 - 128*d2*dy2*f2y2 -
          8*dx2*S2 + 8*dy2*S2 + 64*dx2*dy2*S2;

    var c3 = -256*d2*dx2*f2x + 256*d2*dy2*f2x - 512*d2*dx*dy*f2y*S;

    var c4 = -16*dx4 + 32*dx2*dy2 - 16*dy4 - 64*dx2*dy2*S2;

    //console.log("ceoffs:", c0, c1, c2, c3, c4);

    var xs = quartic(c4, c3, c2, c1, c0);

    var ys = xs.map((x) => { return Math.sqrt(1 - x*x); });
    var ps = xs.map((x, i) => { return [ x, ys[i] ]; });
    //console.log(ps.map((p) => { return p.join(","); }));
    //return ps.map(invert);
    return ps;
  }
};
