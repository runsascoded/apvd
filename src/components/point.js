
import React from 'react';

export default class Point extends React.Component {
  constructor() {
    super();
    this.onMouseDown = this.onMouseDown.bind(this);
  }

  onMouseDown(e) {
    this.props.dragStart(e, this.props.k);
    e.stopPropagation();
  }
  render() {
    return <circle
          r={5 / this.props.scale}
          cx={this.props.cs[0]}
          cy={this.props.cs[1]}
          onMouseDown={this.onMouseDown}
          style={{ fill: this.props.color || 'black' }}
    />;
  }
}
