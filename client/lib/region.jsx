
Region = React.createClass({

  onMouseEnter(e) {
    console.log("enter:", this.props.k, this.props.polygonArea, this.props.secantArea, this.props.area);
  },

  onMouseLeave(e) {
    //console.log("leave:", this.props.k, this);
  },

  render() {
    var {i, width, points, edges} = this.props;
    var n = points.length;
    if (n == 1) {
      var e = edges[0].e;
      return <g
            transform={"translate(" + e.cx + "," + e.cy + ") rotate(" + e.degrees + ")"}>
        <ellipse
              rx={e.rx}
              ry={e.ry}
              className={_.isEmpty(this.props.containers) ? "region" : "clear"}
              stroke="black"
              strokeWidth={width}
              onMouseEnter={this.onMouseEnter}
              onMouseLeave={this.onMouseLeave}
        />
      </g>;
    }

    var d = edges.map(((e, i) => {
      var point = points[i];
      return i ? e.arcpath(point) : e.path(point);
    }).bind(this)).join(" ");

    //console.log("region:", d);
    return <path
          key={i}
          className="region"
          d={d}
          stroke="black"
          strokeWidth={width}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
    />;
  }
});
