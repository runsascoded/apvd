
pi = Math.PI;
pi4 = pi / 4;
tpi = 2 * pi;

cmp = (a,b) => { return a-b; };

r3 = (x) => { return Math.round(1000 * x) / 1000; };

pp = (p, q) => { return '(' + (p instanceof Array ? p : [p, q]).map(r3).join(',') + ')'; };
pc = (p, q) => { return p + "," + q; };

pps = (a) => { return a.map(pp).join(" "); };
cpps = (a) => { console.log(pps(a)); };

deg = (t) => { return 180 * t / pi; };
rad = (d) => { return pi * d / 180; };

pd = (t) => { return r3(deg(t)) + "°"; };

zero = (n) => {
  if (Math.abs(n) < 1e-13) {
    n = 0;
  }
  return n;
};

sq = Math.sqrt;
sq2 = sq(2);

setEntry = (arr, i1, i2, v) => {
  if (!(i1 in arr)) {
    arr[i1] = [];
  }
  arr[i1][i2] = v;
};

pushEntry = (arr, i1, i2, v) => {
  if (!(i1 in arr)) {
    arr[i1] = [];
  }
  var a1 = arr[i1];
  if (!(i2 in a1)) {
    a1[i2] = [];
  }
  a1[i2].push(v);
};

keyStr = (o) => {
  if (o instanceof Set) {
    var a = [];
    o.forEach((v) => { a.push(v); });
    return a.join(",");
  }
  return _.map(o, (v, k) => { return k; }).join(",");
};

eqSet = (as, bs) => {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
};

union = (a,b) => {
  b.forEach((i) => a.add(i));
};

intersect = (a, b) => {
  var intersection = {};
  var aMinusB = {};
  var bMinusA = {};
  for (var k in b) {
    if (k in a) {
      intersection[k] = a[k];
    } else {
      bMinusA[k] = b[k];
    }
  }
  for (var k in a) {
    if (!(k in b)) {
      aMinusB[k] = a[k];
    }
  }
  return [ intersection, aMinusB, bMinusA ];
};

ts = (o) => { return o.toString(); };
tss = (o) => { return o.s(); };

ss = (a, sep) => { return a.map(tss).join(sep || " "); };

sum = (a,b) => { return a+b; };

powerset = (a) => {
  if (!a.length) {
    return [[]];
  }
  var rest = powerset(a.slice(1));
  return rest.map((r) => { return [a[0]].concat(r); }).concat(rest);
};

lengthCmp = (a,b) => {
  var ld = a.length - b.length;
  if (ld) return ld;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

spaces = (n) => {
  var s = "";
  for (var i = 0; i < n; i++) { s += " "; }
  return s;
};
