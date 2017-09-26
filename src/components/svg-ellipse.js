
import React from 'react';
import { sq } from '../lib/utils';
import Point from './point';

export default class SvgEllipse extends React.Component {
  constructor() {
    super();
    this.state = { mouseEntered: false };
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.dragStart = this.dragStart.bind(this);
  }

  onMouseEnter() {
    console.log("mouse enter:", this);
    this.setState({ mouseEntered: true });
  }

  onMouseLeave() {
    this.setState({
      mouseEntered: false
    });
  }

  dragStart(e, k) {
    this.props.dragStart(e, k, this.props.k);
  }

  render() {
    const {cx, cy, rx, ry, degrees, color} = this.props;

    const vx1 = [rx, 0];
    const vx2 = [-rx, 0];

    const vy1 = [0, ry];
    const vy2 = [0, -ry];

    const c = [0, 0];

    const rM = Math.max(rx, ry);
    const rm = Math.min(rx, ry);
    const rc = sq(rM * rM - rm * rm);

    const f1 = rx >= ry ? [rc, 0] : [0, rc];
    const f2 = rx >= ry ? [-rc, 0] : [0, -rc];

    let points = [];
    if (this.state.mouseEntered || this.props.dragging) {
      points = [
        <Point key="f1" k="f1" cs={f1} dragStart={this.dragStart} scale={this.props.scale} color="lightgrey" />,
        <Point key="f2" k="f2" cs={f2} dragStart={this.dragStart} scale={this.props.scale} color="lightgrey" />,
        <Point key="vx1" k="vx1" cs={vx1} dragStart={this.dragStart} scale={this.props.scale} color="black" />,
        <Point key="vx2" k="vx2" cs={vx2} dragStart={this.dragStart} scale={this.props.scale} color="black" />,
        <Point key="vy1" k="vy1" cs={vy1} dragStart={this.dragStart} scale={this.props.scale} color="grey" />,
        <Point key="vy2" k="vy2" cs={vy2} dragStart={this.dragStart} scale={this.props.scale} color="grey" />,
        <Point key="c" k="c" cs={c} dragStart={this.dragStart} scale={this.props.scale} />
      ];
    }

    return <g
          transform={"translate(" + cx + "," + cy + ") rotate(" + degrees + ")"}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={e => { this.dragStart(e, 'c'); }}
    >
      <ellipse rx={rx} ry={ry} style={{ fill: color }} />
      {points}
    </g>;
  }
}

