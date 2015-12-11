
Ellipse = class {
  constructor(o) {
    this.cx = o.cx;
    this.cy = o.cy;
    this.rx = o.rx;
    this.ry = o.ry;
    this.color = o.color;

    if (o.rotate !== undefined) {
      this.rotate = o.rotate;
    } else {
      this.theta = o.theta;
    }

    if (this.theta === undefined) {
      this.theta = this.rotate * pi / 180;
    }
    if (this.rotate === undefined) {
      this.rotate = 180 * this.theta / pi;
    }
    this.t = this.theta;

    this.cos = Math.cos(this.theta);
    this.sin = Math.sin(this.theta);

    var {cx, cy, rx, ry, cos, sin} = this;

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

    this.f1x = cx + fr*(((rx >= ry) ? this.vxx : this.vyx) - cx);
    this.f1y = cy + fr*(((rx >= ry) ? this.vxy : this.vyy) - cy);
    this.f1 = [ this.f1x, this.f1y ];

    this.f2x = cx - fr*(((rx >= ry) ? this.vxx : this.vyx) - cx);
    this.f2y = cy - fr*(((rx >= ry) ? this.vxy : this.vyy) - cy);
    this.f2 = [ this.f2x, this.f2y ];
  }

  toString() {
    return "E(" + r3(this.cx) + "," + r3(this.cy) + "; " + r3(this.rx) + "," + r3(this.ry) + "," + r3(this.rotate) + ")";
  }

  s() {
    return this.toString();
  }

  transform(x, y) {
    if (x instanceof Array) {
      y = x[1];
      x = x[0];
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
    var X = x * this.rx + this.cx;
    var Y = y * this.ry + this.cy;
    return [
      this.cos*X - this.sin*Y,
      this.cos*Y + this.sin*X
    ];
  }

  modify(fields) {
    _.forEach(fields, (v,k) => { this[k] = v; });
    return new Ellipse(this);
  }

  project(e) {
    var c = this.transform(e.cx, e.cy);
    var vx = this.transform(e.vx[0], e.vx[1]);
    var vy = this.transform(e.vy[0], e.vy[1]);

    var rxx = vx[0] - c[0];
    var rxy = vx[1] - c[1];
    var rxd = Math.sqrt(rxx*rxx + rxy*rxy);

    var ryx = vy[0] - c[0];
    var ryy = vy[1] - c[1];
    var ryd = Math.sqrt(ryx*ryx + ryy*ryy);

    var cos = rxx / rxd;
    var sin = rxy / rxd;

    var t = (sin >= 0) ? Math.acos(cos) : -Math.acos(cos);

    console.log("project:", e.toString(), [c, vx, vy].map((p) => { return p.map(r3).join(","); }).join(" "));

    return new Ellipse({ cx: c[0], cy: c[1], rx: rxd, ry: ryd, theta: t, color: e.color });
  }

  intersect(e) {
    var p = this.project(e);
    var uis = p.unitIntersections();
    var ret = uis.map(this.invert);
    console.log("projected:", p.s());
    console.log("unit intxs:", uis.map((p) => { return p.join(","); }));
    console.log("inverted:", ret.map((p) => { return p.join(","); }));

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

    console.log("ceoffs:", c0, c1, c2, c3, c4);

    var xs = quartic(c4, c3, c2, c1, c0);

    var ys = xs.map((x) => { return Math.sqrt(1 - x*x); });
    var ps = xs.map((x, i) => { return [ x, ys[i] ]; });
    console.log(ps.map((p) => { return p.join(","); }));
    //return ps.map(invert);
    return ps;
  }
};

//computeIntersections = (e1, e2) => {
//  var t1 = e1.rotate * Math.PI / 180;
//  var cos1 = Math.cos(t1);
//  var sin1 = Math.sin(t1);
//  function transform(x, y) {
//    if (x instanceof Array) {
//      y = x[1];
//      x = x[0];
//    }
//    return [
//      (cos1*x + sin1*y - e1.cx) / e1.rx,
//      (cos1*y - sin1*x - e1.cy) / e1.ry
//    ];
//  }
//
//  function invert(x, y) {
//    if (x instanceof Array) {
//      y = x[1];
//      x = x[0];
//    }
//    var X = x * e1.rx + e1.cx;
//    var Y = y * e1.ry + e1.cy;
//    return [
//      cos1*X - sin1*Y,
//      cos1*Y + sin1*X
//    ];
//  }
//
//  var t2 = e2.rotate * Math.PI / 180;
//
//  var cos2 = Math.cos(t2);
//  var sin2 = Math.sin(t2);
//
//  var c2t = transform(e2.cx, e2.cy);
//  var vx2t = transform(e2.cx + e2.rx*cos2, e2.cy + e2.rx*sin2);
//  var vy2t = transform(e2.cx - e2.ry*sin2, e2.cy + e2.ry*cos2);
//
//  var rx2tx = vx2t[0] - c2t[0];
//  var rx2ty = vx2t[1] - c2t[1];
//  var rx2td = Math.sqrt(rx2tx*rx2tx + rx2ty*rx2ty);
//
//  var ry2tx = vy2t[0] - c2t[0];
//  var ry2ty = vy2t[1] - c2t[1];
//  var ry2td = Math.sqrt(ry2tx*ry2tx + ry2ty*ry2ty);
//
//  var rM2t = Math.max(rx2td, ry2td);
//  var rm2t = Math.min(rx2td, ry2td);
//
//  var f2t = Math.sqrt(rM2t*rM2t - rm2t*rm2t);
//  var f2r = f2t / rM2t;
//
//  var f21x = c2t[0] + f2r*(((rx2td >= ry2td) ? rx2tx : ry2tx) - c2t[0]);
//  var f21y = c2t[1] + f2r*(((rx2td >= ry2td) ? rx2ty : ry2ty) - c2t[1]);
//
//  var f22x = c2t[0] - f2r*(((rx2td >= ry2td) ? rx2tx : ry2tx) - c2t[0]);
//  var f22y = c2t[1] - f2r*(((rx2td >= ry2td) ? rx2ty : ry2ty) - c2t[1]);
//
//  console.log("transformed ellipse 2: (%f,%f) (%f,%f) (%f,%f)", c2t[0], c2t[1], f21x, f21y, f22x, f22y);
//
//  // sqrt((x - f21x)^2 + (y - f21y)^2) + sqrt((x - f22x)^2 + (y - f22y)^2) == 2*rM2t
//
//  var d = rM2t;
//  var d2 = d*d;
//  var d4 = d2*d2;
//
//  var S = 4*d2 + f21x*f21x + f21y*f21y + f22x*f22x + f22y*f22y;
//  var S2 = S*S;
//  var S4 = S2*S2;
//
//  var dx = f21x - f22x;
//  var dy = f21y - f22y;
//
//  var dx2 = dx*dx;
//  var dx4 = dx2*dx2;
//
//  var dy2 = dy*dy;
//  var dy4 = dy2*dy2;
//
//  var f2x = f22x;
//  var f2y = f22y;
//  var f1x = f21x;
//  var f1y = f21y;
//
//  var f1x2 = f1x*f1x;
//  var f1y2 = f1y*f1y;
//  var f2x2 = f2x*f2x;
//  var f2y2 = f2y*f2y;
//
//  var c0 = -256*d4 + 128*d2*dy2 - 16*dy4 - 512*d4*f2x2 +
//        128*d2*dy2*f2x2 - 256*d4*f2x2*f2x2 + 512*d4*f2y2 +
//        128*d2*dy2*f2y2 - 512*d4*f2x2*f2y2 - 256*d4*f2y2*f2y2 +
//        32*d2*S2 - 8*dy2*S2 + 32*d2*f2x2*S2 + 32*d2*f2y2*S2 - S4;
//
//  var c1 = 1024*d4*f2x - 256*d2*dy2*f2x + 1024*d4*f2x2*f2x +
//        1024*d4*f2x*f2y2 + 512*d2*dx*dy*f2y*S - 64*d2*f2x*S2;
//
//  var c2 = 128*d2*dx2 - 128*d2*dy2 - 32*dx2*dy2 + 32*dy4 -
//        1024*d4*f2x2 + 128*d2*dx2*f2x2 - 128*d2*dy2*f2x2 -
//        1024*d4*f2y2 + 128*d2*dx2*f2y2 - 128*d2*dy2*f2y2 -
//        8*dx2*S2 + 8*dy2*S2 + 64*dx2*dy2*S2;
//
//  var c3 = -256*d2*dx2*f2x + 256*d2*dy2*f2x - 512*d2*dx*dy*f2y*S;
//
//  var c4 = -16*dx4 + 32*dx2*dy2 - 16*dy4 - 64*dx2*dy2*S2;
//
//  console.log("ceoffs:", c0, c1, c2, c3, c4);
//
//  var xs = quartic(c4, c3, c2, c1, c0);
//
//  var ys = xs.map((x) => { return Math.sqrt(1 - x*x); });
//  var ps = xs.map((x, i) => { return [ x, ys[i] ]; });
//  console.log(ps.map((p) => { return p.join(","); }));
//  return ps.map(invert);
//};
//
////Ellipse = Ellipse;
