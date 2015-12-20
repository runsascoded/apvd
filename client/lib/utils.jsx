
pi = Math.PI;
pi4 = pi / 4;

cmp = (a,b) => { return a-b; };

r3 = (x) => { return Math.round(1000 * x) / 1000; };

pp = (p, q) => { return '(' + (p instanceof Array ? p : [p, q]).map(r3).join(',') + ')'; };

pps = (a) => { return a.map(pp).join(" "); };
cpps = (a) => { console.log(pps(a)); };

deg = (t) => { return 180 * t / pi; };
rad = (d) => { return pi * d / 180; };

zero = (n) => {
  if (Math.abs(n) < 1e-13) {
    n = 0;
  }
  return n;
};

sq2 = Math.sqrt(2);
