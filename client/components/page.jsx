
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: 0,
        cy: 1,
        rx: 2,
        ry: 1,
        degrees: 30,
        color: 'red'
      },
      {
        cx: 1,
        cy: 0,
        rx: sq2,
        ry: sq2/2,
        degrees: 45,
        color: 'blue'
      },
      {
        cx: 0,
        cy: -2,
        rx: 1,
        ry: 1,
        degrees: 60,
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

    return <div>
      <Svg
            ellipses={ellipses}
            onChange={this.onChange}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
      />
      <Svg
            ellipses={ellipses0}
            projection={{ x: 0, y: 0, s: 50 }}
            showGrid={true}
            gridSize={1}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[0]}
      />
      <Svg
            ellipses={ _.map(ellipses, (e) => { return e.project(e1); }) }
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

