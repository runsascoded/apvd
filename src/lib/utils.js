
import _ from 'underscore';

export const pi = Math.PI;

export const pi4 = pi / 4;
export const tpi = 2 * pi;

export const cmp = (a, b) => a - b;

export const pp = (p, q) => '(' + (p instanceof Array ? p : [p, q]).map(r3).join(',') + ')';
export const pc = (p, q) => p + "," + q;
export const pps = a => a.map(pp).join(" ");
export const cpps = a => {
  console.log(pps(a));
};

export const deg = t => 180 * t / pi;
export const rad = d => pi * d / 180;

export const pd = t => r3(deg(t)) + "°";

export const zeroCheck = n => (Math.abs(n) < 1e-13) ? 0 : n;

export const sq = Math.sqrt;
export const sq2 = sq(2);

export const setEntry = (arr, i1, i2, v) => {
        if (!(i1 in arr)) {
          arr[i1] = [];
        }
        arr[i1][i2] = v;
};

export const pushEntry = (arr, i1, i2, v) => {
    if (!(i1 in arr)) {
      arr[i1] = [];
    }
    const a1 = arr[i1];
    if (!(i2 in a1)) {
      a1[i2] = [];
    }
    a1[i2].push(v);
};

export const keyStr = (o, sep) => {
    return _.map(o, (v, k) => {
      return k;
    }).join(sep || ",");
  };
export const ks = keyStr;
export const kvs = obj => _.map(
        obj,
        (o, i) => i + ": " + ks(o, "")
  ).join(", ");

export const eqSet = (as, bs) => {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
  };

export const union = (a, b) => {
    b.forEach((i) => a.add(i));
  };

export const intersect = (a, b) => {
    const intersection = {};
    const aMinusB = {};
    const bMinusA = {};
    for (const k in b) {
      if (k in a) {
        intersection[k] = a[k];
      } else {
        bMinusA[k] = b[k];
      }
    }
    for (const k in a) {
      if (!(k in b)) {
        aMinusB[k] = a[k];
      }
    }
    return [intersection, aMinusB, bMinusA];
  };

export const ts = o => o.toString();
export const tss = o => o.s();

export const ss = (a, sep) => a.map(tss).join(sep || " ");

export const sum = (a, b) => a + b;

export const lengthCmp = (a, b) => {
    const ld = a.length - b.length;
    if (ld) return ld;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };

export const pathStr = (points, edges) => {
    return '[' + points.map((p, i) => {
            return pc(r3(p.x), r3(p.y)) + " " + edges[i].i + "→";
          }).join(" ") + ']';
  };
export const ps = pathStr;

export const os = o => {
    return _.map(o, (v, k) => {
      return k + ": " + _.keys(v).join(',');
    }).join(" ");
  };

export const js = JSON.stringify;

export const powerset = (a) => {
  if (!a.length) {
    return [[]];
  }
  const rest = powerset(a.slice(1));
  return rest.map(r => [a[0]].concat(r)).concat(rest);
};

export const spaces = n => {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += " ";
  }
  return s;
}

export const r3 = x => Math.round(1000 * x) / 1000;

export const regionString = r => ps(r.props.points, r.props.edges);
export const rts = regionString;

