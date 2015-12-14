
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
      //console.log("angle:", deg(o.t), deg(t));
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

        //console.log("\trotation-less:", [o.A,o.B,o.C,o.D,o.E,o.F].map(r3).join(","), "->", pp(this.cx, this.cy), pp(this.rx, this.ry), deg(this.theta));

      } else {
        //console.log("unrotating:", [o.A,o.B,o.C,o.D,o.E,o.F].map(r3).join(","), -t);
        var e = this.rotate(-t);
        //console.log("unrotated:", e.toString());
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
        //console.log("transferred rotate:", this.degrees, this.theta, this.t, this.cos, this.sin);
      } else {
        this.theta = o.theta;
        //console.log("transferred theta:", this.degrees, this.theta, this.t, this.cos, this.sin);
      }
    }

    this.color = o.color;

    if (this.theta === undefined) {
      this.theta = this.degrees * pi / 180;
      //console.log("set theta:", this.degrees, this.theta, this.t, this.cos, this.sin);
    }
    if (this.degrees === undefined) {
      this.degrees = 180 * this.theta / pi;
      //console.log("set rotate:", this.degrees, this.theta, this.t, this.cos, this.sin);
    }
    this.t = this.theta;
    //console.log("\tset angle:", [this.t, this.theta, this.degrees].map(r3).join(","));

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

      //var d = rx2*ry2 - cx*cx*ry2 - cy*cy*rx2;
      var d1 = ry*(cx*c + cy*s);
      var d2 = rx*(cy*c - cx*s);
      var d = rx2*ry2 - d1*d1 - d2*d2;

      var a1 = c2*ry2 + s2*rx2;
      var c1 = c2*rx2 + s2*ry2;

      var r1 = ry2 - rx2;

      this.A = a1;
      this.B = 2*c*s*r1;
      this.C = c1;
      this.D = -2 * (cx*a1 + cy*c*s*r1); // 2*(s*cy*rx2 - c*cx*ry2) / d;
      this.E = -2 * (cy*c1 + cx*c*s*r1); //-2*(c*cy*rx2 + s*cx*ry2) / d;
      this.F = -d;
      //console.log("set:", "(" + [this.A, this.B, this.C, this.D, this.E].map(r3).join(",") + ")", d, pp([c, s]), this.degrees, this.t, this.theta);
      //console.log("set ABCs:", this.toString());
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

    //console.log(this.toString(), "(" + [A,B,C,D,E].map(r3).join(",") + ")");
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
    //console.log("translating:", this.toString(), "+", pp(tx, ty));
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

    //console.log("translated:", this.toString(), "+", pp(tx,ty), "->", e.toString());

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
    //console.log("affine:", sx, sy, deg(t), tx, ty);

    return this.translate(tx, ty).rotate(t).scale(sx, sy);

    //var tx2 = tx*tx;
    //var ty2 = ty*ty;
    //var txy = tx*ty;
    //
    //var sx2 = sx*sx;
    //var sy2 = sy*sy;
    //
    //var {A, B, C, D, E} = this;
    //
    //var c = Math.cos(t);
    //var c2 = c*c;
    //var s = Math.sin(t);
    //var s2 = s*s;
    //var cs = c*s;
    //
    //var d = 1 - (D*tx + A*tx2 + E*ty + B*tx*ty + C*ty2);
    //
    //var o = {
    //  A: (A*c2 + B*cs + C*s2) * sx2 / d,
    //  B: (B*(c2 - s2) + 2*cs*(C - A)) * sx * sy / d,
    //  C: (C*c2 - B*cs + A*s2) * sy2 / d,
    //  D: ( 2*A*tx*c + B*tx*s + B*ty*c + 2*C*ty*s + D*c + E*s) * sx / d,
    //  E: (-2*A*tx*s + B*tx*c - B*ty*s + 2*C*ty*c - D*s + E*c) * sy / d,
    //  t: this.t + t,
    //  color: this.color
    //};


    //var d = 1 - ( -D*sx*tx*c - E*sy*ty*c + A*sx2*tx2*c2 +
    //      B*sx*sy*tx*ty*c2 + C*sy2*ty2*c2 + E*sx*tx*s -
    //      D*sy*ty*s - B*sx2*tx2*cs +
    //      2*A*sx*sy*tx*ty*cs - 2*C*sx*sy*tx*ty*cs +
    //      B*sy2*ty2*cs + C*sx2*tx2*s2 -
    //      B*sx*sy*tx*ty*s2 + A*sy2*ty2*s2 );

    //var o = {
    //  A: (A*c2 - B*cs + C*s2) / sx2 / d,
    //  B: (B*(c2 - s2) + 2*cs*(A - C)) / sx / sy / d,
    //  C: (C*c2 + B*cs + A*s2) / sy2 / d,
    //  D: ( D*c - E*s + B/sy*ty*s2 - B/sy*ty*c2 - 2*A/sx*tx*c2 - 2*A/sy*ty*cs + 2*B/sx*tx*cs + 2*C/sy*ty*cs - 2*C/sx*tx*s2 ) / sx / d,
    //  E: ( E*c + D*s + B/sx*tx*s2 - B/sx*tx*c2 - 2*A/sy*ty*s2 - 2*A/sx*tx*cs - 2*B/sy*ty*cs + 2*C/sx*tx*cs - 2*C/sy*ty*c2 ) / sy / d,
    //  t: this.t + t,
    //  color: this.color
    //};


    //var As = A*sx2;
    //var Bs = B*sx*sy;
    //var Cs = C*sy2;
    //var Ds = D*sx;
    //var Es = E*sy;

    //var d = 1 - (
    //            txy*(2*cs*(As - Cs) + Bs*(c2 - s2)) +
    //            tx2*(As*c2 - Bs*cs + Cs*s2) +
    //            ty2*(As*s2 + Bs*cs + Cs*c2)
    //            - Ds*tx*c - Es*ty*c + Es*tx*s - Ds*ty*s
    //      );

    //var o = {
    //  A: ( As*c2 + Bs*cs + Cs*s2 ) / d,
    //  B: ( Bs*(c2 - s2) + 2*cs*(Cs - As) ) / d,
    //  C: ( As*s2 - Bs*cs + Cs*c2 ) / d,
    //  D: ( Ds*c + Es*s - 2*As*tx*c2 + 2*As*ty*cs - Bs*ty*c2 - 2*Bs*tx*cs + Bs*ty*s2 - 2*Cs*ty*cs - 2*Cs*tx*s2 ) / d,
    //  E: ( Es*c - Ds*s + 2*As*tx*cs - 2*As*ty*s2 - Bs*tx*c2 - 2*Bs*ty*cs + Bs*tx*s2 - 2*Cs*ty*c2 - 2*Cs*tx*cs ) / d,
    //  t: this.t + t,
    //  color: this.color
    //};

    //console.log("\t",[A,B,C,D,E].map(r3).join(","), "->", [o.A,o.B,o.C,o.D,o.E].map(r3).join(","), d);
    //
    //return new Ellipse(o);
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

    //var c = this.transform(e.cx, e.cy);
    //var vx = this.transform(e.vx[0], e.vx[1]);
    //var vy = this.transform(e.vy[0], e.vy[1]);
    //
    //var rxx = vx[0] - c[0];
    //var rxy = vx[1] - c[1];
    //var rxd = Math.sqrt(rxx*rxx + rxy*rxy);
    //
    //var ryx = vy[0] - c[0];
    //var ryy = vy[1] - c[1];
    //var ryd = Math.sqrt(ryx*ryx + ryy*ryy);
    //
    //var cos = rxx / rxd;
    //var sin = rxy / rxd;
    //
    //var t = (sin >= 0) ? Math.acos(cos) : -Math.acos(cos);
    //
    ////console.log("project:", e.toString(), [[e.cx,e.cy], e.vx, e.vy].map(pp).join(" "), " | ", [c, vx, vy].map(pp).join(" "));
    //
    //return new Ellipse({ cx: c[0], cy: c[1], rx: rxd, ry: ryd, theta: t, color: e.color });
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
