
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: 0,
        cy: 0,
        rx: 1,
        ry: 2,
        degrees: 0,
        color: 'red'
      },
      {
        cx: 0.5,
        cy: -0.5,
        rx: 2,
        ry: 0.2,
        degrees: -5,
        color: 'blue'
      },
      {
        cx: 0.25,
        cy: -0.8,
        rx: 2,
        ry: 0.6,
        degrees: 30,
        color: 'darkgoldenrod'
      }
    ].map((e) => { return new Ellipse(e); });

    //ellipses[0].intersect(ellipses[1]);

    //var intersections = [];
    //for (var i = 0; i < ellipses.length - 1; i++) {
    //  for (var j = i + 1; j < ellipses.length; j++) {
    //    intersections = intersections.concat(computeIntersections(ellipses[i], ellipses[j]));
    //  }
    //}
    //console.log("intersections:", intersections.map((p) => { return p.join(","); }));

    var ellipsesObj = {};
    ellipses.forEach((e, i) => {
      ellipsesObj[i] = e;
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

    var e0 = ellipses[0];
    var e1 = ellipses[1];

    var ellipses0 = _.map(ellipses, (e) => { return e.project(e0); });
    var ellipses1 = _.map(ellipses, (e) => { return e.project(e1); });

    //var intersections0 = ellipses0[1].unitIntersections();
    var intersections0 = [];
    ellipses0.forEach((e, i) => {
      if (i != 0) {
        intersections0 = intersections0.concat(e.unitIntersections());
      }
    });
    var originalIntersections0 = intersections0.map((p) => { return e0.invert(p); });

    var intersections1 = [];
    ellipses1.forEach((e, i) => {
      if (i != 1) {
        intersections1 = intersections1.concat(e.unitIntersections());
      }
    });
    var originalIntersections1 = intersections1.map((p) => { return e1.invert(p); });

    return <div>
      <Svg
            ellipses={ellipses}
            points={originalIntersections0.concat(originalIntersections1)}
            onChange={this.onChange}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
      />
      <Svg
            ellipses={ellipses0}
            points={intersections0}
            projection={{ x: 0, y: 0, s: 50 }}
            showGrid={true}
            gridSize={1}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[0]}
      />
      <Svg
            ellipses={ ellipses1 }
            points={intersections1}
            projection={{ x: 0, y: 0, s: 50 }}
            showGrid={true}
            gridSize={1}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[1]}
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

