
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
        cx: 0,
        cy: 0,
        rx: 2,
        ry: 1,
        degrees: 90,
        color: 'blue',
        i: 1
      }/*,
      {
        cx: 0.25,
        cy: -0.8,
        rx: 2,
        ry: 0.6,
        degrees: 30,
        color: 'darkgoldenrod',
        i: 2
      }*/
    ].map((e) => { return new Ellipse(e); });

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

    var intersections = [];

    _.forEach(ellipses, (ei, i) => {
      _.forEach(ellipses, (ej, j) => {
        if (i < j) {
          var is = ei.intersect(ej);
          intersections = intersections.concat(is);
        }
      });
    });

    var intersections0 = [];
    var intersections1 = [];
    _.forEach(intersections, (i) => {
      if ('0' in i.o) {
        var o = i.o[0];
        intersections0.push([ o.c, o.s ]);
      }
      if ('1' in i.o) {
        var o = i.o[1];
        intersections1.push([ o.c, o.s ]);
      }
    });

    var iByE = {};
    intersections.forEach((p) => {
      _.forEach(p.o, (o, i) => {
        if (!(i in iByE)) {
          iByE[i] = [];
        }
        iByE[i].push(p);
      });
    });

    _.forEach(iByE, (a, i) => {
      //console.log(a, i);
      a.sort((i1, i2) => {
        return i1.o[i].t - i2.o[i].t;
      });
      var n = a.length;
      a.forEach((p, j) => {
        p.o[i].next = a[(j+1)%n];
        p.o[i].prev = a[(j-1+n)%n];
      });
    });

    console.log(iByE);

    var edgesByE = {};
    _.forEach(iByE, (a, i) => {
      var edges = a.map((p) => {
        var e = ellipses[i];
        if (!(i in edgesByE)) {
          edgesByE[i] = [];
        }
        return new Edge({
          e: e,
          p1: p,
          p2: p.o[i].next
        });
      });
      edgesByE[i] = edges;

      console.log("i:", i, "\n\t" + a.map((p, j) => {
              var edge = edges[j];
              var o = p.o[i];
              return r3(deg(o.t)) + ": " +
                    r3(deg(o.prev.o[i].t)) + " " + r3(deg(o.next.o[i].t)) + ", (" +
                    [edge.x1, edge.y1, deg(edge.t1)].map(r3).join(",") + ") (" +
                    [edge.x2, edge.y2, deg(edge.t2)].map(r3).join(",") + ")";
            }).join("\n\t"));
    });
    console.log(intersections.map((i) => { return i.toString(); }).join("\n"));

    return <div>
      <Svg
            ellipses={ellipses}
            edges={/*edgesByE[1]*/ edgesByE[0].concat(edgesByE[1])}
            points={intersections}
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

