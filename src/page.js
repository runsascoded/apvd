
import _ from 'underscore';
import React from 'react';
import Svg from './components/svg';
import ModelTextField from './components/model-text-field';
import Ellipse from './lib/ellipse';
import Ellipses from './lib/ellipses';
import { lengthCmp, pi, powerset, r3, spaces } from './lib/utils';

export default class Page extends React.Component {
  constructor() {
    super();
    let ellipses = [
      {
        cx: -0.82,
        cy: 0.38,
        rx: 1,
        ry: 2,
        degrees: 0,
        color: 'red',
        i: 0,
        name: "A"
      },
      {
        cx: -0.7,
        cy: 0.12,
        rx: 1.3,
        ry: 0.4,
        degrees: 114,
        color: 'blue',
        i: 1,
        name: "B"
      },
      {
        cx: 0.5,
        cy: 1.52,
        rx: .94,
        ry: .48,
        degrees: 18,
        color: 'darkgoldenrod',
        i: 2,
        name: "C"
      },
      {
        cx: 0,
        cy: 0,
        rx: .6,
        ry: .48,
        degrees: -44,
        color: 'green',
        i: 3,
        name: "D"
      }
    ].map(e => new Ellipse(e));

    const ellipsesObj = {};
    ellipses.forEach((e) => {
      ellipsesObj[e.i] = e;
    });
    this.state = { ellipses: ellipsesObj };
    this.onCursor = this.onCursor.bind(this);
    this.onEllipseDrag = this.onEllipseDrag.bind(this);
  }

  onTextFieldChange(value) {
    try {
      const ellipses = JSON.parse(value);
      this.setState({
        ellipses,
        malformedEllipses: false
      });
    } catch(err) {
      this.setState({ malformedEllipses: true });
    }
  }

  onEllipseDrag(k, change) {
    const newEllipseK = this.state.ellipses[k].modify(change);
    const o = {}; o[k] = newEllipseK;
    const newEllipses = _.extend(this.state.ellipses, o);
    this.setState({ ellipses: newEllipses });
  }

  onCursor(p, svgIdx) {
    this.setState({
      virtualCursor: p,
      activeSvg: svgIdx
    });
  }

  render() {
    const { ellipses, malformedEllipses, activeSvg } = this.state;
    const e = new Ellipses(ellipses);
    const { intersections, regions } = e;
    const areaKeys =
          powerset(_.keys(ellipses))
                .map(s => { return {
                  key: s.join(","),
                  name: s.length ? s.map(k => ellipses[k].name).join("⋂") : "*"
                }})
                .sort(
                      (
                            { key:k1, name:n1 },
                            { key:k2, name:n2 }
                      ) =>
                            lengthCmp(k1, k2)
                );

    const maxKeyLen = Math.max.apply(Math, areaKeys.map(k => k.name.length));

    const areasStr =
          areaKeys.map(
                rs => {
                  const area = e.areasObj[rs.key] || 0;
                  return rs.name + spaces(maxKeyLen - rs.name.length) + ": " + r3(area / pi);
                })
                .join("\n");

    const projectedSVGs =
          _.map(
                ellipses,
                (ellipse, k) =>
                      <Svg
                            key={k}
                            transformBy={ellipses[k]}
                            ellipses={ellipses}
                            points={intersections}
                            cursor={this.state.virtualCursor}
                            showGrid={true}
                            gridSize={1}
                            projection={{ x: 0, y: 0, s: 50 }}
                            onCursor={p => this.onCursor(p, k)}
                            hideCursorDot={activeSvg === k}
                      />

          );

    return <div>
      <Svg
            key="main"
            ellipses={ellipses}
            points={intersections}
            cursor={this.state.virtualCursor}
            regions={regions}
            onEllipseDrag={this.onEllipseDrag}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
            hideCursorDot={activeSvg === undefined}
      />
      {projectedSVGs}
      <textarea
            className="areas"
            onChange={() => {}}
            value={areasStr}
      />
      <ModelTextField
            {...{ellipses, malformedEllipses}}
            onChange={this.onTextFieldChange}
      />
    </div>
  }
}
