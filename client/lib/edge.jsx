
Edge = class {
  constructor(o) {
    this.e = o.e;
    this.i = this.e.i;
    this.j = o.j;
    this.rx = this.e.rx;
    this.ry = this.e.ry;
    this.t = this.e.t;

    this.p1 = o.p1;
    this.x1 = this.p1.x;
    this.y1 = this.p1.y;
    this.o1 = this.p1.o[this.i];
    this.t1 = this.o1.t;
    this.p1.addEdge(this);

    this.p2 = o.p2;
    this.x2 = this.p2.x;
    this.y2 = this.p2.y;
    this.o2 = this.p2.o[this.i];
    this.t2 = this.o2.t;
    this.p2.addEdge(this);

    this.n = 0;
    this.ps = [ this.p1, this.p2 ];

    this.mt = (this.t1 + this.t2 + (this.t2 < this.t1 ? tpi : 0)) / 2;
    this.mp = this.e.getPoint(this.mt);

    this.dt = this.t2 - this.t1;
    if (this.dt < 0) {
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

    //this.containers = new Set();
    this.containers = {};
  }

  hasContainers(containers) {
    for (var c in containers) {
      if (!(c in this.containers) && c != this.i) return false;
    }
    return true;
  }

  other(p) {
    if (p == this.p1) return this.p2;
    if (p == this.p2) return this.p1;
    throw new Error("Invalid p: " + p.toString() + " in " + this.toString());
  }

  get ellipses() {
    var o = _.extend({}, this.containers);
    o[this.i] = true;
    return o;
  }

  toString() {
    return "Edge(" +
          this.i +": " +
          pp(this.x1,this.y1) + " -> " + pp(this.x2, this.y2) + ", " +
          pd(this.t1) + "->" + pd(this.t2) + ", " +
          pp(this.mp) + ")";
  }

  s() {
    return "Edge(" + pp(this.x1,this.y1) + "," + pp(this.x2, this.y2) + ")";
  }

  arcpath(from) {
    var {rx, ry, e} = this;
    var xf = from.x;
    var yf = from.y;
    var to = this.other(from);
    var xt = to.x;
    var yt = to.y;

    //console.log(this.s(), pd(td), pd(tf), pd(tt));
    var largeArc = (this.dt > pi) ? 1 : 0;
    var sweepFlag = (from == this.p1) ? 1 : 0;
    return [
      "A" + pc(rx, ry),
      deg(e.t),
      pc(largeArc, sweepFlag),
      pc(xt, yt)
      //,"Z"
    ].join(' ');
  }

  path(from) {
    return "M" + pc(from.x, from.y) + " " + this.arcpath(from);
  }

  elem(i, width) {
    return <path
          key={i}
          d={this.path(this.p1)}
          stroke={this.e.color}
          strokeWidth={width}
          className="edge"
          fill={this.e.color}
    />;
  }
};
