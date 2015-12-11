
cubic = (a, b, c, d) => {
  if (d != undefined) {
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
      return [ -Math.sqrt(-p), 0, Math.sqrt(-p) ];
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
      return 2 * Math.sqrt(p3) * Math.cos((Math.acos(q2/Math.sqrt(p33)) - 2*pi*k) / 3);
    }
    var roots = [ tk(0), tk(1), tk(2) ];
    roots.sort(cmp);
    return roots;
  } else {

    if (r == 0) {
      return [ 3*q/p, -q2/p3, -q2/p3 ].sort(cmp);
    } else {
      var sq = Math.sqrt(r);
      //console.log("sq:", sq);
      return [ Math.cbrt(q2 + sq) + Math.cbrt(q2 - sq) ];
    }
  }
};

