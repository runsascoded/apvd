
SvgEllipse = React.createClass({
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
        <Point key="vx1" k="vx1" cs={vx1} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="vx2" k="vx2" cs={vx2} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="vy1" k="vy1" cs={vy1} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="vy2" k="vy2" cs={vy2} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="c" k="c" cs={c} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="f1" k="f1" cs={f1} dragStart={this.dragStart} scale={this.props.scale} />,
        <Point key="f2" k="f2" cs={f2} dragStart={this.dragStart} scale={this.props.scale} />
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

