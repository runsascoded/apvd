
import React from 'react';

export default class ModelTextField extends React.Component {
  onChange(e) {
    this.props.onChange(e.target.value);
  }
  render() {
    return <textarea
          className={"model-text-field" + (this.props.malformedEllipses ? " malformed" : "")}
          onKeyPress={this.onKeyPress}
          onKeyDown={this.onKeyDown}
          onChange={this.onChange}
          value={JSON.stringify(this.props.ellipses, null, 2)}
    />;
  }
}

