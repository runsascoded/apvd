
cubic = (a, b, c, d) => {
  if (d != undefined) {
    if (a == 0) {
      var D = c*c - 4*b*d;
      //console.log("quadratic:", b, c, d, " ", D);
      if (D > 0) {
        var sqD = sq(D);
        return [ (-c + sqD) / 2 / b, (-c - sqD) / 2 / b ];
      } else if (D == 0) {
        return [ -c / 2 / b ];
      }
      return [];
    }
    return cubic(b/a, c/a, d/a);
  }

  if (c != undefined) {
    var p = b - a*a/3;
    var q = c - a*b/3 + 2*a*a*a/27;
    return cubic(p, q).map((x) => { return x - a/3; });
  }

  var p = a;
  var q = b;

  if (q == 0) {
    if (p < 0) {
      return [ -sq(-p), 0, sq(-p) ];
    }
    return [ 0 ];
  } else if (p == 0) {
    return [ Math.cbrt(-q) ];
  }
  var p3 = -p/3;
  var p33 = p3*p3*p3;
  var q2 = -q/2;
  var q22 = q2*q2;

  var r = q22 - p33;
  //console.log("cubic:", p, q, r);

  if (r < 0) {
    function tk(k) {
      return 2 * sq(p3) * Math.cos((Math.acos(q2/sq(p33)) - 2*pi*k) / 3);
    }
    var roots = [ tk(0), tk(1), tk(2) ];
    roots.sort(cmp);
    return roots;
  } else {

    if (r == 0) {
      return [ 3*q/p, -q2/p3, -q2/p3 ].sort(cmp);
    } else {
      var sqr = sq(r);
      //console.log("sq:", sq);
      return [ Math.cbrt(q2 + sqr) + Math.cbrt(q2 - sqr) ];
    }
  }
};

