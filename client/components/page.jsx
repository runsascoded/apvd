
Page = React.createClass({
  getInitialState() {
    var ellipses = [
      {
        cx: 20,
        cy: -10,
        rx: 50,
        ry: 60,
        rotate: 45,
        color: 'red'
      },
      {
        cx: 20,
        cy: 20,
        rx: 70,
        ry: 40,
        rotate: 20,
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

  render() {
    var ellipses = this.state.ellipses;
    var transformedEllipses = _.map(ellipses, (e) => { return ellipses[0].project(e); });
    //console.log("transformed:", transformedEllipses[0].toString());
    return <div>
      <Svg
            ellipses={ellipses}
            onChange={this.onChange}
            showGrid={true}
            gridSize={20}
            projection={{ x: 0, y: 0, s: 1.6 }}
      />
      <Svg
            ellipses={transformedEllipses}
            projection={{ x: 0, y: 0, s: 50 }}
            showGrid={true}
            gridSize={1}
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

