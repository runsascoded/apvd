
Svg = React.createClass({
  getInitialState() {
    return {
      dragging: false,
      cursor: {
        x: 0,
        y: 0
      },
      vcursor: { x: 0, y: 0 }
    };
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
    var node = ReactDOM.findDOMNode(this);
    this.setState({
      dragging: true,
      dragNode: k,
      dragEllipse: ek,
      dragStartX: e.clientX - node.offsetLeft,
      dragStartY: e.clientY - node.offsetTop
    });
  },
  getTheta(x, y, t) {
    //y = -y;
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
    var node = ReactDOM.findDOMNode(this);
    var offsetX = e.clientX - node.offsetLeft;
    var offsetY = e.clientY - node.offsetTop;

    var vOffset = this.invert(offsetX, offsetY);

    this.setState({
      vcursor: vOffset,
      cursor: { x: offsetX, y: offsetY }
    });

    if (this.props.onCursor) {
      this.props.onCursor(vOffset);
    }

    if (this.state.dragging) {
      var dx = (offsetX - this.state.dragStartX) / this.scale();
      var dy = (offsetY - this.state.dragStartY) / this.scale();
      var ellipse = this.props.ellipses[this.state.dragEllipse];
      if (this.state.dragNode == 'c') {
        this.props.onChange(
              this.state.dragEllipse,
              {
                cx: ellipse.cx + dx,
                cy: ellipse.cy - dy
              }
        );
      } else if (this.state.dragNode == 'vx1' || this.state.dragNode == 'vx2') {
        if (this.state.dragNode == 'vx2') {
          dx = -dx;
          dy = -dy;
        }
        var rx = ellipse.rx;
        var t = ellipse.degrees * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var rxx = rx * cos;
        var rxy = rx * sin;
        var nxx = rxx + dx;
        var nxy = rxy - dy;
        var { theta, r } = this.getTheta(nxx, nxy, t);
        //console.log("new:", r, theta * 180 / Math.PI);
        this.props.onChange(
              this.state.dragEllipse,
              {
                degrees: theta * 180 / Math.PI,
                rx: r
              }
        );
      } else if (this.state.dragNode == 'vy1' || this.state.dragNode == 'vy2') {
        if (this.state.dragNode == 'vy2') {
          dx = -dx;
          dy = -dy;
        }
        var ry = ellipse.ry;
        var t = ellipse.degrees * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var ryx = -ry * sin;
        var ryy = ry * cos;
        var nyx = ryx + dx;
        var nyy = ryy - dy;

        var { theta, r } = this.getTheta(nyy, -nyx, t);
        this.props.onChange(
              this.state.dragEllipse,
              {
                degrees: theta * 180 / Math.PI,
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
        var t = ellipse.degrees * Math.PI / 180;
        var cos = Math.cos(t);
        var sin = Math.sin(t);
        var fx = f * (rx >= ry ? cos : -sin);
        var fy = f * (rx >= ry ? sin : cos);
        var nfx = fx + dx;//(rx >= ry ? dx : -dx);
        var nfy = fy - dy;//(rx >= ry ? dy : -dy);
        var { theta, r } = this.getTheta(rx >= ry ? nfx : nfy, rx >= ry ? nfy : -nfx, t);
        var changes = { degrees: theta * 180 / Math.PI };

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
        dragStartX: offsetX,
        dragStartY: offsetY
      });
    }
  },
  componentDidMount() {
    //console.log("svg:", ReactDOM.findDOMNode(this));
    this.setState({ width: 300, height: 400 });
  },
  invert(x, y) {
    return {
      x: (x - this.state.width/2) / this.scale(),
      y: (y - this.state.height/2) / -this.scale()
    };
  },
  scale() {
    return this.props.projection && this.props.projection.s || 1
  },
  render() {
    var width = this.state.width || 300;
    var height = this.state.height || 400;
    var transforms = [];
    var {projection, ellipses, showGrid, gridSize, projectedCursor, points} = this.props;
    //console.log("ellipses:", _.map(ellipses, (e) => { return e.toString(); }).join(" "));
    if (projection) {
      if (projection.x !== undefined || projection.y !== undefined) {
        transforms.push([ "translate", (projection.x + width/2) || 0, (projection.y + height/2) || 0 ]);
      }
      if (projection.s) {
        transforms.push([ "scale", projection.s, -projection.s ]);
      }
    }

    var s = this.scale();

    //function transform(x, y) {
    //  return [ x*s + width/2, -y*s + height/2 ];
    //}

    gridSize = gridSize || (Math.min(width, height) / 11 / s);
    var gridLines = [];
    if (showGrid !== undefined) {
      var tl = this.invert(0, 0);
      var lx = tl.x - gridSize;
      var ty = tl.y + gridSize;

      var br = this.invert(width, height);
      var rx = br.x + gridSize;
      var by = br.y - gridSize;

      var startX = lx - (lx % gridSize);
      //if (startX < 0) {
      //  startX += (startX % gridSize) - gridSize;
      //} else {
      //  startX -= (startX % gridSize);
      //}

      var vLines = [];
      for (var x = startX; x <= rx; x += gridSize) {
        var d = "M" + x + " " + ty + "V" + by;
        vLines.push(
              <path
                    key={"v-"+x}
                    className={"grid-line" + (x == 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
              />
        );
      }
      gridLines.push(<g key="vertical" className="grid-lines vertical">{vLines}</g>);

      var startY = by - (by % gridSize);
      //if (startY < 0) {
      //  startY+= (startY % gridSize) - gridSize;
      //} else {
      //  startY -= (startY % gridSize);
      //}

      //console.log("x: %f (%f) %f, y: %f (%f) %f", lx, startX, rx, by, startY, ty);

      var hLines = [];
      for (var y = startY; y <= ty; y += gridSize) {
        var d = "M" + lx + " " + y + "H" + rx;
        //console.log("hline:", d);
        hLines.push(
              <path
                    key={"h-"+y}
                    className={"grid-line" + (y == 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
              />
        );
      }
      gridLines.push(<g key="horizontal" className="grid-lines horizontal">{hLines}</g>);

    }

    //if (projectedCursor) {
    //  console.log("projected cursor:", projectedCursor);
    //}

    var svgEllipses = [];
    for (var k in ellipses) {
      svgEllipses.push(
            <SvgEllipse
                  key={k}
                  k={k}
                  dragging={this.state.dragEllipse == k}
                  dragStart={this.dragStart}
                  {...ellipses[k]}
                  scale={s}
            />
      );
    }

    var svgPoints = [];
    if (points) {
      svgPoints =
            points.map((p, i) => {
              return <circle key={i} r={3 / s} className="projected-point" cx={p[0]} cy={p[1]} />
            });
    }

    return <svg
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
    >
      <g
            className="projection"
            transform={
              transforms.length ?
              transforms.map((t) => { return t[0] + "(" + t.slice(1).join(",") + ")"; }).join(" ")
              : null
            }
      >
        {gridLines}
        <g className="ellipses">
          {svgEllipses}
        </g>
        {svgPoints}
        {
          projectedCursor ?
                <circle
                      className="projected-cursor"
                      r={3 / s}
                      cx={projectedCursor[0]}
                      cy={projectedCursor[1]}
                /> :
                null
        }
      </g>
      <text className="cursor" x="10" y="20">
        {
          [
            this.state.cursor.x.toString().substr(0,4),
            this.state.cursor.y.toString().substr(0,4)
          ].join(",")
        }
      </text>
      <text className="cursor" x="10" y="40">
        {
          [
            this.state.vcursor.x.toString().substr(0,4),
            this.state.vcursor.y.toString().substr(0,4)
          ].join(",")
        }
      </text>
    </svg>;
  }
});

