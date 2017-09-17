
Intersection = class {
  constructor(o) {
    //console.log("Int:", o);
    this.e1 = o.e1;
    this.e2 = o.e2;
    this.i1 = this.e1.i;
    this.i2 = this.e2.i;
    const {e1, e2} = o;
    this.o = {};
    const e1o = {};
    const e2o = {};

    if (o.t1 === undefined) {
      e1o.t = e1.polar(o.x, o.y).t;
      //console.log("e1o.t:", e1o.t);
    } else {
      e1o.t = o.t1;
    }
    if (o.t2 === undefined) {
      e2o.t = e2.polar(o.x, o.y).t;
    } else {
      e2o.t = o.t2;
    }

    if (o.c1 === undefined) {
      e1o.c = Math.cos(e1o.t);
      e1o.s = Math.sin(e1o.t);
      //console.log("e1o.cs:", e1o.c, e1o.s);
    } else {
      e1o.c = o.c1;
      e1o.s = o.s1;
    }

    if (o.c2 === undefined) {
      e2o.c = Math.cos(e2o.t);
      e2o.s = Math.sin(e2o.t);
    } else {
      e2o.c = o.c2;
      e2o.s = o.s2;
    }

    if (o.x === undefined) {
      const [x, y] = e1.invert(e1o.c, e1o.s);
      this.x = x;
      this.y = y;
    } else {
      this.x = o.x;
      this.y = o.y;
    }

    this.o[e1.i] = e1o;
    this.o[e2.i] = e2o;

    this.edges = [];
  }

  addEdge(edge) {
    this.edges.push(edge);
    //if (!(edge.i in this.edges)) {
    //  this.edges[edge.i] = [];
    //}
    //this.edges[edge.i].push(edge);
  }

  other(e) {
    if (e === this.e1) return this.e2;
    if (e === this.e2) return this.e1;
    throw new Error("Bad other ellipse req: " + e.toString() + " in " + this.toString());
  }

  toString() {
    return "I(" +
          [
            pp(this.x, this.y),
            pp(this.o[this.i1].c, this.o[this.i1].s),
            pp(this.o[this.i2].c, this.o[this.i2].s),
            r3(deg(this.o[this.i1].t)),
            r3(deg(this.o[this.i2].t))
          ].join(" ") +
          ")";
  }

  s() {
    return "I" + pp(this.x, this.y);
  }
};
