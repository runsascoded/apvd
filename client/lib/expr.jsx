
Expr = class {
  constructor(o) {
    this.o = o;
  }

  add(e) {
    return new Expr({ add1: this, add2: e });
  }

  plus(e) {
    return this.add(e);
  }

  sub(e) {
    return new Expr({ add1: this, add2: e.neg });
  }

  get neg() {
    return new Expr({ mul1: C(-1), mul2: this });
  }

  mult(e) {
    return new Expr({ mul1: this, mul2: e });
  }

  div(e) {
    return new Expr({ mul1: this, mul2: e.recip });
  }

  get recip() {
    return this.pow(-1);
  }

  get sqrt() {
    return this.pow(1/2)
  }

  pow(n) {
    return new Expr({ base: this, exp: n });
  }

  get cos() {
    return new Expr({ cos: this });
  }

  get sin() {
    return new Expr({ sin: this });
  }

  get acos() {
    return new Expr({ acos: this });
  }

  derivative(n) {
    var k;
    var o = this.o;
    for (k in o) {
      break;
    }
    var v = o[k];
    if (k == 'n') {
      if (o.n == n) {
        return one;
      }
      return zero;
    } else if (k == 'v') {
      return zero;
    } else if (k == 'add1' || k == 'add2') {
      return o.add1.derivative(n).plus(o.add2.derivative(n));
    } else if (k == 'mul1' || k == 'mul2') {
      return o.mul1.derivative(n).mult(o.mul2).plus(o.mul2.derivative(n).mult(o.mul1));
    } else if (k == 'base' || k == 'exp') {
      return o.base.pow(o.exp - 1).mult(o.base.derivative(n)).mult(C(o.exp));
    } else if (k == 'cos') {
      return o.cos.derivative(n).neg.mult(o.cos.sin);
    } else if (k == 'acos') {
      var e = o.acos;
      return e.derivative(n).neg.div(one.sub(e.pow(2)).sqrt)
    }
    throw new Error("Unrecognized Expr in derivative: " + js(o));
  }

  eval(vs) {
    var k;
    var o = this.o;
    for (k in o) {
      break;
    }
    var v = o[k];
    if (k == 'n') {
      if (!(o.n in vs)) {
        throw new Error("Not found: " + o.n + " in " + JSON.stringify(vs));
      }
      return vs[o.n];
    } else if (k == 'v') {
      return o.v;
    } else if (k == 'add1' || k == 'add2') {
      return o.add1.eval(vs) + o.add2.eval(vs);
    } else if (k == 'mul1' || k == 'mul2') {
      return o.mul1.eval(vs) * o.mul2.eval(vs);
    } else if (k == 'base' || k == 'exp') {
      return Math.pow(o.base.eval(vs), o.exp);
    } else if (k == 'cos') {
      return Math.cos(o.cos.eval(vs));
    } else if (k == 'acos') {
      var e = o.acos;
      return Math.acos(o.acos.eval(vs));
    } else if (k == 'sin') {
      return Math.sin(o.sin.eval(vs));
    }
  }
};

C = (v) => { return new Expr({ v: v }); };
V = (n) => { return new Expr({ n: n }); };
zero = C(0);
one = C(1);
