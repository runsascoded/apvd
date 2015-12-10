
pi = Math.PI;

cmp = (a,b) => { return a-b; }

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

quartic = (a, b, c, d, e) => {

  if (e != undefined) {
    return quartic(b/a, c/a, d/a, e/a);
  }

  if (d != undefined) {
    var p = b - 3*a*a/8;
    var q = c + a*(a*a - 4*b)/8;
    var r = d + a*(-3*a*a*a - 64*c + 16*a*b)/256;
    return quartic(p, q, r).map((x) => { return x - a/4; });
  }

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
      var sq2 = Math.sqrt(q2);
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

Page = React.createClass({
  computeIntersections(e1, e2) {
    var t1 = e1.rotate * Math.PI / 180;
    var cos1 = Math.cos(t1);
    var sin1 = Math.sin(t1);
    function transform(x, y) {
      if (x instanceof Array) {
        y = x[1];
        x = x[0];
      }
      return [
        (cos1*x + sin1*y - e1.cx) / e1.rx,
        (cos1*y - sin1*x - e1.cy) / e1.ry
      ];
    }

    var r2M = Math.max(e2.rx, e2.ry);
    var r2m = Math.min(e2.rx, e2.ry);
    var f2 = Math.sqrt(r2M*r2M - r2m*r2m);

    var t2 = e2.rotate * Math.PI / 180;
    var cos2 = Math.cos(t2);
    var sin2 = Math.sin(t2);

    var f21x = e2.cx + (e2.rx >= e2.ry ? (e2.rx * cos2) : (e2.ry * -sin2));
    var f21y = e2.cy + (e2.rx >= e2.ry ? (e2.rx * sin2) : (e2.ry * cos2));

    var f22x = 2*e2.cx - f21x;
    var f22y = 2*e2.cy - f21y;

    var t2x = e2.cx + (e2.rx >= e2.ry ? (e2.ry * -sin2) : (e2.rx * cos2));
    var t2y = e2.cy + (e2.rx >= e2.ry ? (e2.ry * cos2) : (e2.rx * sin2));

    var f21t = transform(f21x, f21y);
    var f22t = transform(f22x, f22y);
    var t2t = transform(t2x, t2y);

    var fd2xt = f21t[0] - t2t[0];
    var fd2yt = f21t[1] - t2t[1];
    var rM2t = Math.sqrt(fd2xt*fd2xt + fd2yt*fd2yt);

    var c2t = [(f21t[0] + f22t[0])/2, (f21t[1] + f22t[1])/2];
    var rm2xt = t2t[0] - c2t[0];
    var rm2yt = t2t[1] - c2t[1];
    var rm2t = Math.sqrt(rm2xt*rm2xt + rm2yt*rm2yt);


  },
  getInitialState() {
    var ellipses = [
      {
        cx: 150,
        cy: 150,
        rx: 50,
        ry: 60,
        rotate: 45,
        color: 'red'
      },
      {
        cx: 200,
        cy: 200,
        rx: 70,
        ry: 40,
        rotate: 20,
        color: 'blue'
      }
    ];

    var intersections = [];
    for (var i = 0; i < ellipses.length - 1; i++) {
      for (var j = i + 1; j < ellipses.length; j++) {
        intersections = intersections.concat(this.computeIntersections(ellipses[i], ellipses[j]));
      }
    }
    console.log("intersections:", intersections);

    var ellipsesObj = {};
    ellipses.forEach((e, i) => {
      ellipsesObj[i] = e;
    });
    return {
      ellipses: ellipsesObj
    };
  },
  onTextFieldChange(value) {
    try {
      var ellipses = JSON.parse(value);
      this.setState({ ellipses: ellipses, malformedEllipses: false });
    } catch(err) {
      this.setState({ malformedEllipses: true });
    }
  },
  onChange(k, v) {
    var newEllipseK = _.extend(this.state.ellipses[k], v);
    var o = {}; o[k] = newEllipseK;
    var newEllipses = _.extend(this.state.ellipses, o);
    this.setState({ ellipses: newEllipses });
  },
  render() {
    var ellipses = this.state.ellipses;
    return <div>
      <Svg
            ellipses={ellipses}
            onChange={this.onChange}
      />
      <ModelTextField
            ellipses={ellipses}
            onChange={this.onTextFieldChange}
            malformedEllipses={this.state.malformedEllipses}
      />
    </div>
  }
});

ModelTextField = React.createClass({
  onChange(e) {
    this.props.onChange(e.target.value);
  },
  render() {
    return <textarea
          className={"model-text-field" + (this.props.malformedEllipses ? " malformed" : "")}
          onKeyPress={this.onKeyPress}
          onKeyDown={this.onKeyDown}
          onChange={this.onChange}
          value={JSON.stringify(this.props.ellipses, null, 2)}
    />;
  }
});

Svg = React.createClass({
  getInitialState() {
    return { dragging: false };
  },
  onMouseUp(e) {
    if (this.state.dragging) {
      this.setState({
        dragging: false,
        dragEllipse: null
      });
    }
  },
  dragStart(e, k, ek) {
    this.setState({
      dragging: true,
      dragNode: k,
      dragEllipse: ek,
      dragStartX: e.clientX,
      dragStartY: e.clientY
    });
  },
  getTheta(x, y, t) {
    var r = Math.sqrt(x*x + y*y);
    var theta = null;
    var pi4s = Math.round(t * 2 / Math.PI);

    if (-1 == pi4s) {
      theta = -Math.acos(x/r)
    } else if (0 == pi4s) {
      theta = Math.asin(y/r);
    } else if (1 == pi4s) {
      theta = Math.acos(x/r);
    } else if (1 < pi4s) {
      theta = Math.PI - Math.asin(y/r);
      if (theta > Math.PI) theta -= 2*Math.PI;
    } else if (pi4s < -1) {
      theta = -Math.PI - Math.asin(y/r);
      if (theta < -Math.PI) theta += 2*Math.PI;
    }
    return {
      theta: theta,
      r: r
    };
  },
  onMouseMove(e) {
    if (this.state.dragging) {
      var dx = e.clientX - this.state.dragStartX;
      var dy = e.clientY - this.state.dragStartY;
      var ellipse = this.props.ellipses[this.state.dragEllipse];
      if (this.state.dragNode == 'c') {
        this.props.onChange(
              this.state.dragEllipse,
              {
                cx: ellipse.cx + dx,
                cy: ellipse.cy + dy
              }
        );
      } else if (this.state.dragNode == 'vx1' || this.state.dragNode == 'vx2') {
        if (this.state.dragNode == 'vx2') {
          dx = -dx;
          dy = -dy;
        }
        var rx = ellipse.rx;
        var t = ellipse.rotate * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var rxx = rx * cos;
        var rxy = rx * sin;
        var nxx = rxx + dx;
        var nxy = rxy + dy;
        var { theta, r } = this.getTheta(nxx, nxy, t);
        //console.log("new:", r, theta * 180 / Math.PI);
        this.props.onChange(
              this.state.dragEllipse,
              {
                rotate: theta * 180 / Math.PI,
                rx: r
              }
        );
      } else if (this.state.dragNode == 'vy1' || this.state.dragNode == 'vy2') {
        if (this.state.dragNode == 'vy2') {
          dx = -dx;
          dy = -dy;
        }
        var ry = ellipse.ry;
        var t = ellipse.rotate * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var ryx = -ry * sin;
        var ryy = ry * cos;
        var nyx = ryx + dx;
        var nyy = ryy + dy;

        var { theta, r } = this.getTheta(nyy, -nyx, t);
        this.props.onChange(
              this.state.dragEllipse,
              {
                rotate: theta * 180 / Math.PI,
                ry: r
              }
        );
      } else if (this.state.dragNode == 'f1' || this.state.dragNode == 'f2') {
        if (this.state.dragNode == 'f2') {
          dx = -dx;
          dy = -dy;
        }
        var {rx, ry} = ellipse;
        var rM = Math.max(rx, ry);
        var rm = Math.min(rx, ry);
        var f = Math.sqrt(rM*rM - rm*rm);
        var t = ellipse.rotate * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var fx = f * (rx >= ry ? cos : -sin);
        var fy = f * (rx >= ry ? sin : cos);
        var nfx = fx + dx;
        var nfy = fy + dy;
        var { theta, r } = this.getTheta(rx >= ry ? nfx : nfy, rx >= ry ? nfy : -nfx, t);
        var changes = { rotate: theta * 180 / Math.PI };

        if (rx >= ry) {
          changes.rx = Math.sqrt(ry*ry + r*r);
        } else {
          changes.ry = Math.sqrt(rx*rx + r*r);
        }

        this.props.onChange(
              this.state.dragEllipse,
              changes
        );
      }
      this.setState({
        dragStartX: e.clientX,
        dragStartY: e.clientY
      });
    }
  },
  render() {
    var ellipses = [];
    for (var k in this.props.ellipses) {
      ellipses.push(
            <Ellipse
                  key={k}
                  k={k}
                  dragging={this.state.dragEllipse == k}
                  dragStart={this.dragStart}
                  {...this.props.ellipses[k]}
            />
      );
    };
    return <svg
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
    >
      {ellipses}
    </svg>;
  }
});

Template.registerHelper('Page', () => { return Page; });

Ellipse = React.createClass({
  getInitialState() {
    return {
      mouseEntered: false
    };
  },
  onMouseEnter() {
    this.setState({ mouseEntered: true });
  },
  onMouseLeave() {
    this.setState({
      mouseEntered: false
    });
  },
  dragStart(e, k) {
    this.props.dragStart(e, k, this.props.k);
  },
  render() {
    var {cx, cy, rx, ry, rotate, color} = this.props;

    var vx1 = [ rx, 0 ];
    var vx2 = [ -rx, 0 ];

    var vy1 = [ 0, ry ];
    var vy2 = [ 0, -ry ];

    var c = [ 0, 0 ];

    var rM = Math.max(rx, ry);
    var rm = Math.min(rx, ry);
    var rc = Math.sqrt(rM*rM - rm*rm);

    var f1 = rx >= ry ? [ rc, 0 ] : [ 0, rc ];
    var f2 = rx >= ry ? [ -rc, 0 ] : [ 0, -rc ];

    var points = [];
    if (this.state.mouseEntered || this.props.dragging) {
      points = [
        <Point key="vx1" k="vx1" cs={vx1} dragStart={this.dragStart} />,
        <Point key="vx2" k="vx2" cs={vx2} dragStart={this.dragStart} />,
        <Point key="vy1" k="vy1" cs={vy1} dragStart={this.dragStart} />,
        <Point key="vy2" k="vy2" cs={vy2} dragStart={this.dragStart} />,
        <Point key="c" k="c" cs={c} dragStart={this.dragStart} />,
        <Point key="f1" k="f1" cs={f1} dragStart={this.dragStart} />,
        <Point key="f2" k="f2" cs={f2} dragStart={this.dragStart} />
      ];
    }

    return <g
          transform={"translate(" + cx + "," + cy + ") rotate(" + rotate + ")"}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={(e) => { this.dragStart(e, 'c'); }}
    >
      <ellipse rx={rx} ry={ry} style={{ fill: color }} />
      {points}
    </g>;
  }
});

Point = React.createClass({
  onMouseDown(e) {
    this.props.dragStart(e, this.props.k);
    e.stopPropagation();
  },
  render() {
    return <circle
          r={5}
          cx={this.props.cs[0]}
          cy={this.props.cs[1]}
          onMouseDown={this.onMouseDown}
    />;
  }
});
