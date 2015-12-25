
//Region = class {
//  constructor(o) {
//    this.edges = o.edges;
//    this.points = o.points;
//    this.k = o.k;
//  }

Region = React.createClass({

  onMouseEnter(e) {
    console.log("enter:", this.props.k);
  },

  onMouseLeave(e) {
    //console.log("leave:", this.props.k, this);
  },

  render() {
    var {i, width, points, edges} = this.props;
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

  //toString() {
  //  return "R(" + this.k + "  " + this.points.map(tss).join(" ") + ")";
  //}
});
