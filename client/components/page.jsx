
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: 0,
        cy: 0,
        rx: 1,
        ry: 1,
        degrees: 0,
        color: 'red'
      },
      {
        cx: 1,
        cy: 0,
        rx: sq2,//Math.sqrt(2),
        ry: sq2/2,//Math.sqrt(2)/2,
        degrees: 45,
        color: 'blue'
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
    //_.map(change, (v, k) => {
    //  ellipseK[k] = v;
    //});
    //var newEllipseK = _.extend(this.state.ellipses[k], v);
    var o = {}; o[k] = newEllipseK;
    var newEllipses = _.extend(this.state.ellipses, o);
    this.setState({ ellipses: newEllipses });
  },

  onCursor(p) {
    //var transformed = _.map(this.state.ellipses, (e, k) => { return e.transform(p) });
    //this.setState({
    //  projectedCursor: transformed
    //});
  },

  render() {
    var ellipses = this.state.ellipses;
    //var transformedEllipses = _.map(ellipses, (e) => { return ellipses[0].project(e); });

    var e0 = ellipses[0];
    var e1 = ellipses[1];

    //var transformedEllipses = [ e0.project(e0) ];

    var numPoints = 16;

    var e0Points = [];
    var e1Points = [];
    //var e1Points =
    //      _.range(0, numPoints)
    //            .map((i) => { return 2 * pi * i / numPoints; })
    //            .map(e1.getPoint.bind(e1));

    var transformed0Points = [];
    var transformed1Points = [];
    //var transformed1Points =
    //            e1Points.map(e0.transform.bind(e0));

    //var e0Points =
    //      _.range(0, numPoints)
    //            .map((i) => { return 2 * pi * i / numPoints; })
    //            .map(e0.getPoint.bind(e0));

    //var transformed0Points =
    //      e0Points.map(e1.transform.bind(e1));

    //[ e1.vx, e1.vy, e1.vx2, e1.vy2 ].map(e0.transform.bind(e0));

    //console.log(e1Points.map(pp).join(" "));
    //console.log(transformedPoints.map(pp).join(" "));

    //console.log("transformed:", transformedEllipses[0].toString());

    //console.log("ellipses:", _.map(ellipses, (e) => { return e.toString(); }).join(" "));

    var ellipses0 = _.map(ellipses, (e) => { return e.project(e0); });
    //var ellipses1 = _.map(ellipses, (e) => { return e.project(e1); });
    //var ellipses0 = _.map(ellipses, (e) => { return e.rotate(-e.t); });
    //var ellipses0 = _.map(ellipses, (e) => { return e.translate(1, 0); });
    //console.log("ellipses0:", ellipses0.map((e) => { return e.toString(); }).join(" "));

    return <div>
      <Svg
            ellipses={ellipses}
            points={e1Points}
            onChange={this.onChange}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={this.onCursor}
      />
      <Svg
            ellipses={ellipses0}
            points={transformed1Points}
            projection={{ x: 0, y: 0, s: 50 }}
            showGrid={true}
            gridSize={1}
            projectedCursor={this.state.projectedCursor && this.state.projectedCursor[0]}
      />
      <Svg
            ellipses={ _.map(ellipses, (e) => { return e.project(e1); }) }
            points={transformed0Points}
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

