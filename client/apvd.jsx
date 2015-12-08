
Page = React.createClass({
  getInitialState() {
    return {
      ellipses: {
        0: {
          cx: 100,
          cy: 100,
          rx: 50,
          ry: 30,
          rotate: 45,
          style: {fill: 'red'}
        }
      }
    };
  },
  ellipseDrag() {

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
    console.log("change:", k, v);
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
          defaultValue={JSON.stringify(this.props.ellipses, null, 2)}
    />;
  }
});

Svg = React.createClass({
  getInitialState() {
    return { dragging: false };
  },
  onMouseUp(e) {
    if (this.state.dragging) {
      console.log("drag stop");
      this.setState({ dragging: false });
    }
  },
  dragStart(e, k, ek) {
    console.log("drag start", e.clientX, e.clientY);
    this.setState({
      dragging: true,
      dragNode: k,
      dragEllipse: ek,
      dragStartX: e.clientX,
      dragStartY: e.clientY
    });
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
      } else if (this.state.dragNode == 'vx1') {
        var rx = ellipse.rx;
        var theta = ellipse.rotate * Math.PI / 180;
        var cos = Math.cos(theta);
        var sin = Math.sin(theta);
        var rxx = rx * cos;
        var rxy = rx * sin;
        var nxx = rxx + dx;
        var nxy = rxy + dy;
        var nx = Math.sqrt(nxx*nxx + nxy*nxy);
        var ntheta = null;//Math.acos(nxx/nx);
        var pi4s = Math.round(theta * 2 / Math.PI);

        if (-1 == pi4s) {
          ntheta = -Math.acos(nxx/nx)
        } else if (0 == pi4s) {
          ntheta = Math.asin(nxy/nx);
        } else if (1 == pi4s) {
          ntheta = Math.acos(nxx/nx);
        } else if (1 < pi4s) {
          ntheta = Math.PI - Math.asin(nxy/nx);
          if (ntheta > Math.PI) ntheta -= 2*Math.PI;
        } else if (pi4s < -1) {
          ntheta = -Math.PI - Math.asin(nxy/nx);
          if (ntheta < -Math.PI) ntheta += 2*Math.PI;
        }
        console.log("new:", nx, ntheta * 180 / Math.PI, pi4s);
        this.props.onChange(
              this.state.dragEllipse,
              {
                rotate: ntheta * 180 / Math.PI,
                rx: nx
              }
        );
      } else if (this.state.dragNode == 'vx2') {

      } else if (this.state.dragNode == 'vy1') {

      } else if (this.state.dragNode == 'vy2') {

      } else if (this.state.dragNode == 'f1') {

      } else if (this.state.dragNode == 'f2') {

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
    var {cx, cy, rx, ry, rotate, style} = this.props;

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
    >
      <ellipse rx={rx} ry={ry} style={style} />
      {points}
    </g>;
  }
});

Point = React.createClass({
  onMouseDown(e) {
    this.props.dragStart(e, this.props.k);
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
