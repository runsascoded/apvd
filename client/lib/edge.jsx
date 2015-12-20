
Edge = class {
  constructor(o) {
    this.e = o.e;
    this.i = this.e.i;
    this.rx = this.e.rx;
    this.ry = this.e.ry;
    this.t = this.e.t;

    this.p1 = o.p1;
    this.x1 = this.p1.x;
    this.y1 = this.p1.y;
    this.o1 = this.p1.o[this.i];
    this.t1 = this.o1.t;

    this.p2 = o.p2;
    this.x2 = this.p2.x;
    this.y2 = this.p2.y;
    this.o2 = this.p2.o[this.i];
    this.t2 = this.o2.t;

  }
};
