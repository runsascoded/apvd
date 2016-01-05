
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: -0.82,
        cy: 0.38,
        rx: 1,
        ry: 2,
        degrees: 0,
        color: 'red',
        i: 0
      },
      {
        cx: -0.7,
        cy: 0.12,
        rx: 1.3,
        ry: 0.4,
        degrees: 114,
        color: 'blue',
        i: 1
      },
      {
        cx: 0.5,
        cy: 1.52,
        rx: .94,
        ry: .48,
        degrees: 18,
        color: 'darkgoldenrod',
        i: 2
      },
      {
        cx: 0,
        cy: 0,
        rx: .6,
        ry: .48,
        degrees: -44,
        color: 'green',
        i: 3
      }
    ].map((e) => { return new Ellipse(e); });

    var ellipsesObj = {};
    ellipses.forEach((e) => {
      ellipsesObj[e.i] = e;
    });
    return {
      ellipses: ellipsesObj
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

  onChange(k, change) {
    var newEllipseK = this.state.ellipses[k].modify(change);
    var o = {}; o[k] = newEllipseK;
    var newEllipses = _.extend(this.state.ellipses, o);
    this.setState({ ellipses: newEllipses });
  },

  onCursor(p) {
    var transformed = _.map(this.state.ellipses, (e, k) => { return e.transform(p) });
    this.setState({
      projectedCursor: transformed
    });
  },

  render() {
    var ellipses = this.state.ellipses;
    var e = new Ellipses(ellipses);
    //console.log(e.areasObj);
    var { intersections, edgesByE, regions } = e;

    var e0 = ellipses[0];
    var e1 = ellipses[1];
    var e2 = ellipses[2];

    var ellipses0 = _.map(ellipses, (e) => { return e.project(e0); });
    var ellipses1 = e1 ? _.map(ellipses, (e) => { return e.project(e1); }) : [];
    var ellipses2 = e2 ? _.map(ellipses, (e) => { return e.project(e2); }) : [];

    var intersections0 = [];
    var intersections1 = [];
    var intersections2 = [];
    _.forEach(intersections, (i) => {
      intersections0.push(e0.transform(i.x, i.y));
      intersections1.push(e1.transform(i.x, i.y));
      intersections2.push(e2.transform(i.x, i.y));
    });

    //var ellipseKeys = _.keys(ellipses).join(",");
    var areaKeys = powerset(_.keys(ellipses)).map((s) => { return s.join(","); }).sort(lengthCmp);
    //var areaKeys = _.keys(e.areasObj).sort(lengthCmp);
    var maxKeyLen = Math.max.apply(Math, areaKeys.map((k) => { return k.length; }));
    var areasStr =
          areaKeys.map((rs) => {
            var area = e.areasObj[rs] || 0;
            return rs + spaces(maxKeyLen - rs.length) + ": " + r3(area / pi);
          }).join("\n");

    return <div>
      <Svg
            ellipses={ellipses}
            points={intersections}
            regions={regions}
            onChange={this.onChange}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
      />
      <Svg
            ellipses={ellipses0}
            points={intersections0}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[0]}
        />
      <Svg
            ellipses={ellipses1}
            points={intersections1}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[1]}
      />
      <Svg
            ellipses={ellipses2}
            points={intersections2}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[2]}
      />
      <textarea
            className="areas"
            onChange={(e) => {}}
            value={areasStr}
      />
      <ModelTextField
            ellipses={ellipses}
            onChange={this.onTextFieldChange}
            malformedEllipses={this.state.malformedEllipses}
      />
    </div>
  }
});

Template.registerHelper('Page', () => { return Page; });

