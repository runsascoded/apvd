
//Region = class {
//  constructor(o) {
//    this.edges = o.edges;
//    this.points = o.points;
//    this.k = o.k;
//  }

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
              className="region"
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

    //this.area = regionArea;
    //this.secantArea = secantArea;
    //this.polygonArea = polygonArea;
    //
    //console.log("region:", this);

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

  //toString() {
  //  return "R(" + this.k + "  " + this.points.map(tss).join(" ") + ")";
  //}
});
