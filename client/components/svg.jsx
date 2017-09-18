
import React from 'react';
import ReactDOM from 'react-dom';

Svg = React.createClass({
  getInitialState() {
    return {
      dragging: false,
      pointRadius: 3
    };
  },

  onMouseUp() {
    if (this.state.dragging) {
      this.setState({
        dragging: false,
        dragEllipse: null
      });
    }
  },

  dragStart(e, k, ek) {
    const { left, top } = this.domRect();
    this.setState({
      dragging: true,
      dragNode: k,
      dragEllipse: ek,
      dragStartX: e.clientX - left,
      dragStartY: e.clientY - top
    });
  },

  getTheta(x, y, t) {
    const r = sq(x * x + y * y);
    let theta = null;
    const pi4s = Math.round(t * 2 / Math.PI);

    if (-1 === pi4s) {
      theta = -Math.acos(x/r)
    } else if (0 === pi4s) {
      theta = Math.asin(y/r);
    } else if (1 === pi4s) {
      theta = Math.acos(x/r);
    } else if (1 < pi4s) {
      theta = Math.PI - Math.asin(y/r);
      if (theta > Math.PI)
        theta -= 2*Math.PI;
    } else if (pi4s < -1) {
      theta = -Math.PI - Math.asin(y/r);
      if (theta < -Math.PI)
        theta += 2*Math.PI;
    }
    return { theta, r };
  },

  domRect() {
    return ReactDOM.findDOMNode(this).getBoundingClientRect();
  },

  onMouseMove(e) {
    const { left, top } = this.domRect();
    const offsetX = e.clientX - left;
    const offsetY = e.clientY - top;

    const vOffset = this.virtual(offsetX, offsetY);

    if (this.props.onCursor) {
      if (this.props.transformBy) {
        const [x, y] = this.props.transformBy.invert(vOffset.x, vOffset.y);
        this.props.onCursor({ x, y });
      } else
        this.props.onCursor(vOffset);
    }

    const { dragging, dragStartX, dragStartY, dragEllipse, dragNode } = this.state;

    if (dragging && this.props.onEllipseDrag) {
      let dx = (offsetX - dragStartX) / this.scale();
      let dy = (offsetY - dragStartY) / this.scale();
      const ellipse = this.props.ellipses[dragEllipse];
      if (dragNode === 'c') {
        this.props.onEllipseDrag(
              dragEllipse,
              {
                cx: ellipse.cx + dx,
                cy: ellipse.cy - dy
              }
        );
      } else {
        const t = ellipse.degrees * Math.PI / 180;  // TODO: can this be ellipse.theta?
        const cos = Math.cos(t);
        const sin = Math.sin(t);
        if (dragNode === 'vx1' || dragNode === 'vx2') {
          if (dragNode === 'vx2') {
            dx = -dx;
            dy = -dy;
          }
          const rx = ellipse.rx;
          const rxx = rx * cos;
          const rxy = rx * sin;
          const nxx = rxx + dx;
          const nxy = rxy - dy;
          const { theta, r } = this.getTheta(nxx, nxy, t);
          this.props.onEllipseDrag(
                dragEllipse,
                {
                  degrees: theta * 180 / Math.PI,
                  rx: r
                }
          );
        } else if (dragNode === 'vy1' || dragNode === 'vy2') {
          if (dragNode === 'vy2') {
            dx = -dx;
            dy = -dy;
          }
          const ry = ellipse.ry;
          const ryx = -ry * sin;
          const ryy = ry * cos;
          let nyx = ryx + dx;
          const nyy = ryy - dy;

          const { theta, r } = this.getTheta(nyy, -nyx, t);
          this.props.onEllipseDrag(
                dragEllipse,
                {
                  degrees: theta * 180 / Math.PI,
                  ry: r
                }
          );
        } else if (dragNode === 'f1' || dragNode === 'f2') {
          if (dragNode === 'f2') {
            dx = -dx;
            dy = -dy;
          }
          const { rx, ry } = ellipse;
          const rM = Math.max(rx, ry);
          const rm = Math.min(rx, ry);
          const f = sq(rM * rM - rm * rm);
          const fx = f * (rx >= ry ? cos : -sin);
          const fy = f * (rx >= ry ? sin : cos);
          const nfx = fx + dx;
          const nfy = fy - dy;
          const { theta, r } =
                this.getTheta(
                      rx >= ry ? nfx : nfy,
                      rx >= ry ? nfy : -nfx,
                      t
                );
          const changes = {degrees: theta * 180 / Math.PI};

          if (rx >= ry) {
            changes.rx = sq(ry*ry + r*r);
          } else {
            changes.ry = sq(rx*rx + r*r);
          }

          this.props.onEllipseDrag(
                dragEllipse,
                changes
          );
        }
      }
      this.setState({
        dragStartX: offsetX,
        dragStartY: offsetY
      });
    }
  },

  componentDidMount() {
    this.setState({
      width: 300,
      height: 400
    });
  },

  transformed(x, y) {
    if (this.props.transformBy) {
      const [ tx, ty ] = this.props.transformBy.transform([ x, y ]);
      return { x: tx, y: ty };
    } else {
      return { x, y };
    }
  },

  virtual(x, y) {
    return {
      x: (x - this.state.width / 2) / this.scale(),
      y: (y - this.state.height / 2) / -this.scale()
    };
  },

  actual(x, y) {
    return {
      x: x * this.scale() + this.state.width / 2,
      y: y * this.scale() + this.state.height / 2,
    }
  },

  scale() {
    return this.props.projection && this.props.projection.s || 1
  },

  render() {
    const width = this.state.width || 300;
    const height = this.state.height || 400;
    const { dragEllipse, pointRadius } = this.state;
    const transforms = [];
    let { projection, ellipses, transformBy, cursor, showGrid, gridSize, points, regions, hideCursorDot } = this.props;

    if (projection) {
      if (projection.x !== undefined || projection.y !== undefined) {
        transforms.push([
          "translate",
          (projection.x + width/2) || 0,
          (projection.y + height/2) || 0
        ]);
      }
      if (projection.s) {
        transforms.push([ "scale", projection.s, -projection.s ]);
      }
    }

    const s = this.scale();

    gridSize = gridSize || (Math.min(width, height) / 11 / s);

    const gridLines = [];
    if (showGrid !== undefined) {
      const tl = this.virtual(0, 0);
      const lx = tl.x - gridSize;
      const ty = tl.y + gridSize;

      const br = this.virtual(width, height);
      const rx = br.x + gridSize;
      const by = br.y - gridSize;

      const startX = lx - (lx % gridSize);

      const vLines = [];
      for (let x = startX; x <= rx; x += gridSize) {
        const d = "M" + x + " " + ty + "V" + by;
        vLines.push(
              <path
                    key={"v-"+x}
                    className={"grid-line" + (x === 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
              />
        );
      }
      gridLines.push(<g key="vertical" className="grid-lines vertical">{vLines}</g>);

      const startY = by - (by % gridSize);

      const hLines = [];
      for (let y = startY; y <= ty; y += gridSize) {
        const d = "M" + lx + " " + y + "H" + rx;
        hLines.push(
              <path
                    key={"h-"+y}
                    className={"grid-line" + (y === 0 ? " axis" : "")}
                    strokeWidth={gridSize / 20}
                    d={d}
              />
        );
      }
      gridLines.push(
            <g key="horizontal" className="grid-lines horizontal">{hLines}</g>
      );
    }

    const svgEllipses = [];
    _.forEach(ellipses, (ellipse, k) => {

      //console.log("projecting:", ellipse, "into", transformBy);
      const transformedEllipse =
            transformBy ?
                  ellipse.project(transformBy) :
                  ellipse;

      svgEllipses.push(
            <SvgEllipse
                  key={k}
                  k={k}
                  dragging={dragEllipse === k}
                  dragStart={this.dragStart}
                  {...transformedEllipse}
                  scale={s}
            />
      );
    });

    let svgPoints = [];
    if (points) {
      svgPoints =
            points.map(
                  (p, i) => {
                    const t = this.transformed(p.x, p.y);
                    //console.log("transformed point:", p, t);
                    return <circle
                          key={i}
                          r={pointRadius / s}
                          className="projected-point"
                          cx={t.x}
                          cy={t.y}
                    />
                  }
            );
    }

    const transformedCursor = cursor ? this.transformed(cursor.x, cursor.y) : null;
    const rawCursor = cursor ? this.actual(transformedCursor.x, transformedCursor.y) : null;

    const [ cursorCircle, cursorVirtualCoords, cursorRawCoords ] =
          cursor ?
                [
                  hideCursorDot ?
                        null :
                        <circle
                              className="projected-cursor"
                              r={3 / s}
                              cx={transformedCursor.x}
                              cy={transformedCursor.y}
                        />,
                  <text className="cursor" x="10" y="20">
                    {
                      [
                        cursor.x.toString().substr(0,4),
                        cursor.y.toString().substr(0,4)
                      ].join(",")
                    }
                  </text>,
                  <text className="cursor" x="10" y="40">
                    {
                      [
                        rawCursor.x.toString().substr(0,4),
                        rawCursor.y.toString().substr(0,4)
                      ].join(",")
                    }
                  </text>
                ] :
                [
                  null,
                  null,
                  null
                ];

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
        <g className="regions">{regions}</g>
        <g className="ellipses">{svgEllipses}</g>
        <g className="points">{svgPoints}</g>
        {cursorCircle}
      </g>
      {cursorRawCoords}
      {cursorVirtualCoords}
    </svg>;
  }
});
