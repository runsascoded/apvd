
Page = React.createClass({
  getInitialState() {
    return {
      ellipses: [
        {
          cx: 100,
          cy: 100,
          rx: 50,
          ry: 30,
          style: {fill: 'red'}
        }
      ]
    };
  },
  onTextFieldChange(value) {
    try {
      var ellipses = JSON.parse(value);
      this.setState({ ellipses: ellipses, malformedEllipses: false });
    } catch(err) {
      this.setState({ malformedEllipses: true });
    }
  },
  render() {
    var ellipses = this.state.ellipses;
    return <div>
      <Svg ellipses={ellipses} />
      <ModelTextField
            ellipses={ellipses}
            onChange={this.onTextFieldChange}
            malformedEllipses={this.state.malformedEllipses}
      />
    </div>
  }
});

ModelTextField = React.createClass({
  onChange(e) {
    this.props.onChange(e.target.value);
  },
  render() {
    return <textarea
          className={"model-text-field" + (this.props.malformedEllipses ? " malformed" : "")}
          onKeyPress={this.onKeyPress}
          onKeyDown={this.onKeyDown}
          onChange={this.onChange}
          defaultValue={JSON.stringify(this.props.ellipses, null, 2)}
    />;
  }
});

Svg = React.createClass({
  render() {
    var ellipses = this.props.ellipses.map((ellipse, idx) => {
      return <Ellipse key={idx} {...ellipse} />;
    });
    return <svg>
      {ellipses}
    </svg>;
  }
});

Template.registerHelper('Page', () => { return Page; });

Ellipse = React.createClass({
  render() {
    return <ellipse {...this.props} />;
  }
});
