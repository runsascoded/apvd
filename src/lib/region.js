
import _ from 'underscore';
import React from 'react';

export default class Region extends React.Component {

  constructor() {
    super();
    this.onMouseEnter = this.onMouseEnter.bind(this);
  }

  onMouseEnter() {
    console.log("enter:", this.props.k, this.props.polygonArea, this.props.secantArea, this.props.area);
  }

  onMouseLeave(e) {
    //console.log("leave:", this.props.k, this);
  }

  render() {
    const {i, width, points, edges} = this.props;
    const n = points.length;
    if (n === 1) {
      const e = edges[0].e;
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

    const d = edges.map((e, i) => {
      const point = points[i];
      return i ? e.arcpath(point) : e.path(point);
    }).join(" ");

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
}
