
import React from 'react';

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
          value={JSON.stringify(this.props.ellipses, null, 2)}
    />;
  }
});

