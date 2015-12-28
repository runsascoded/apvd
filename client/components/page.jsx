
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: -0.82,
        cy: 0.38,
        rx: 2,
        ry: 3,
        degrees: 0,
        color: 'red',
        i: 0
      },
      {
        cx: 0.5,
        cy: -0.44,
        rx: 1.85,
        ry: 1,
        degrees: -23,
        color: 'darkgoldenrod',
        i: 2
      },
      {
        cx: 0,
        cy: 0,
        rx: .5,
        ry: .5,
        degrees: 90,
        color: 'blue',
        i: 1
      },
      {
        cx: -0.8,
        cy: 0,
        rx: .5,
        ry: .5,
        degrees: 0,
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

    //var e0 = ellipses[0];
    //var e1 = ellipses[1];
    //
    //var ellipses0 = _.map(ellipses, (e) => { return e.project(e0); });
    //var ellipses1 = e1 ? _.map(ellipses, (e) => { return e.project(e1); }) : [];

    //var intersections0 = [];
    //var intersections1 = [];
    //_.forEach(intersections, (i) => {
    //  if ('0' in i.o) {
    //    var o = i.o[0];
    //    intersections0.push([ o.c, o.s ]);
    //  }
    //  if ('1' in i.o) {
    //    var o = i.o[1];
    //    intersections1.push([ o.c, o.s ]);
    //  }
    //});

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
            edges={/*edgesByE[0].concat(edgesByE[1])*/[]}
            points={intersections}
            regions={regions}
            onChange={this.onChange}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
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

