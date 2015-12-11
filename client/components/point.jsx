
Point = React.createClass({
  onMouseDown(e) {
    this.props.dragStart(e, this.props.k);
    e.stopPropagation();
  },
  render() {
    return <circle
          r={5 / this.props.scale}
          cx={this.props.cs[0]}
          cy={this.props.cs[1]}
          onMouseDown={this.onMouseDown}
    />;
  }
});
