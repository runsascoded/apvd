
quartic = (a, b, c, d, e) => {

  if (e != undefined) {
    if (a == 0) {
      return cubic(b, c, d, e);
    }
    return quartic(b/a, c/a, d/a, e/a);
  }

  if (d != undefined) {
    var p = b - 3*a*a/8;
    var q = c + a*(a*a - 4*b)/8;
    var r = d + a*(-3*a*a*a - 64*c + 16*a*b)/256;
    return quartic(p, q, r).map((x) => { return x - a/4; });
  }

  //console.log("depressed quartic:", a, b, c);

  var roots = [];
  if (b == 0) {
    var d = a*a - 4*c;
    if (d < 0) return [];
    var sq = Math.sqrt(d);
    var q1 = (-a + sq)/2;
    var q2 = (-a - sq)/2;

    //console.log("biquadratic:", a, c, d, sq, q1, q2);

    if (q1 >= 0) {
      var sq1 = Math.sqrt(q1);
      roots = roots.concat([ -sq1, sq1 ]);
    }
    if (q2 >= 0) {
      roots = roots.concat([ -sq2, sq2 ]);
    }
    return roots.sort(cmp);
  }

  var croots = cubic(5*a/2, 2*a*a - c, a*a*a/2 - a*c/2 - b*b/8);
  //console.log("croots:", croots);
  var y = croots[0];

  var sq = Math.sqrt(a + 2*y);

  function root(s1, s2) {
    var s1sq = s1*sq;
    var B = -(3*a + 2*y + 2*b/s1sq);
    if (B >= 0) {
      var sq1 = Math.sqrt(B);
      roots.push((s1sq + s2 * sq1) / 2);
    }
  }

  root(1, 1);
  root(1, -1);
  root(-1, 1);
  root(-1, -1);

  //var rootsObj = {};
  //roots.forEach((r) => { rootsObj[r] = true });
  //roots = [];
  //for (var k in rootsObj) { roots.push(k); }

  return roots.sort(cmp);
};

