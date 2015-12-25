
Ellipses = class {
  constructor(ellipses) {
    this.ellipses = ellipses;

    this.computeIntersections();
    this.computeIntersectionsByEllipse();
    this.computeEdgesByEllipse();
    this.computeEdgeContainments();
    this.computeRegions();

    //console.log(this.regions.map(ts).join("\n"));
  }

  computeRegions() {
    var regionsObj = {};
    var regions = [];
    var visitedPoints = {};
    var edges = [];
    var points = [];
    var edgeVisits = {};

    function canVisit(edge) {
      if (!(edge.j in edgeVisits)) return true;
      var n = edgeVisits[edge.j];
      return n < 1 || (n == 1 && !_.isEmpty(edge.containers));
    }

    var numEdgeVisits = 0;
    function visitEdge(edge) {
      edges.push(edge);
      edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
    }

    function unvisitEdge() {
      var edge = edges.pop();
      edgeVisits[edge.j] = edgeVisits[edge.j] - 1;
    }

    var intersections = this.intersections;
    function traverse(point, region, prevUnusedEllipses, startPoint, level) {
      function log() {
        var args = Array.prototype.slice.apply(arguments);
        var indent = "";
        for (var i = 0; i < level || 0; i++) {
          indent += "  ";
        }
        //console.log.apply(console, [indent].concat(args));
      }

      //console.log("traverse:", point.toString(), region);
      if (point == startPoint) {
        var regionKey = _.keys(region);
        numEdgeVisits += regionKey.length;
        var regionStr = regionKey.sort().join("");

        var firstEdge = edges[0];
        var lastEdge = edges[edges.length - 1];
        if (firstEdge.e == lastEdge.e) {
          console.log(
                "invalid region:", regionStr, regionKey, region, "\n\t" +
                points.map((p) => { return p.s(); }).join("\n\t")
          );
          return;
        }

        //console.log(
        //      "region:", regionStr, regionKey, region, "\n\t" +
        //      points.map((p) => { return p.s(); }).join("\n\t")
        //      edges.map((e) => { return e.s(); }).join("\n\t")
        //);

        _.forEach(edges, (edge) => {
          edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
        });

        if (!(regionStr in regionsObj)) {
          regionsObj[regionStr] = [];
        }
        //var r = new Region({
        //  edges: _.extend([], edges),
        //  points: _.extend([], points),
        //  k: regionStr
        //});
        var r =
              <Region
                    k={regionStr}
                    edges={_.extend([], edges)}
                    points={_.extend([], points)}
                    i={regions.length}
                    key={regions.length}
                    width={3 / 50}
              />;
        regionsObj[regionStr].push(r);
        regions.push(r);

        return;
        //return new Region({ edges: edges });
      }
      if (point.i in visitedPoints) {
        return;
      }
      if (region && _.isEmpty(region)) {
        return;
      }
      //if (edges.length) {
        //var prevEdge = edges[edges.length - 1];
        //var prevEllipse = prevEdge.e;
      var prevEllipse = edges.length ? edges[edges.length - 1].e : null;
      log("continuing point:", point.s(), keyStr(region));
      visitedPoints[point.i] = true;
      points.push(point);
      _.forEach(point.edges, (edge) => {

        log(
              "checking:",
              edge.s(),
              canVisit(edge),
              edge.j,
              edgeVisits[edge.j],
              edge.e != prevEllipse
        );
        if (canVisit(edge) &&
                //edge.hasContainers(region) &&
              edge.e != prevEllipse) {

          visitEdge(edge);
          log("adding edge:", edge.s(), keyStr(edge.ellipses));
          var [ newRegion, lostEllipses, unusedEllipses ] =
                region ?
                      intersect(region, edge.ellipses) :
                      [ edge.ellipses, {} ];

          if (edges.length >= 3 && !_.isEmpty(lostEllipses)) {
            //console.log(
            //      "lost ellipses:",
            //      keyStr(lostEllipses),
            //      ss(points.concat([edge.other(point)]))
            //);
          } else {
            var doublyUnused = intersect(unusedEllipses, prevUnusedEllipses || {})[0];
            if (!_.isEmpty(doublyUnused)) {
              //console.log(
              //      "doubly-unused ellipses:",
              //      keyStr(doublyUnused),
              //      ss(points.concat([edge.other(point)])),
              //      edge.e.i, "vs.", prevEllipse.i
              //);
            } else {
              traverse(
                    edge.other(point),
                    newRegion,
                    unusedEllipses,
                    startPoint || point,
                    (level || 0) + 1
              );
            }
          }
          unvisitEdge();
          log("removed edge:", edge.s(), edge.j, edgeVisits[edge.j]);
        }

      });
      delete visitedPoints[point.i];
      points.pop();
    }

    for (var i = 0; i < intersections.length && numEdgeVisits < this.totalEdgeVisits; i++) {
      traverse(intersections[i]);
    }

    this.regionsObj = regionsObj;
    this.regions = regions;
    //this.regions = regions.slice(0, 1);
  }

  computeIntersections() {
    var ellipses = this.ellipses;
    var intersections = [];
    var containments = [];
    var intsByExE = [];
    _.forEach(ellipses, (ei, i) => {
      containments[i] = [];
      intsByExE[i] = [];
      _.forEach(ellipses, (ej, j) => {
        intsByExE[i][j] = [];
        if (i < j) {
          var is = ei.intersect(ej);
          if (is.length) {
            intersections = intersections.concat(is);
          } else {
            if (ei.contains(ej.cx, ej.cy)) {
              console.log(i, "contains", j);
              containments[i][j] = true;
            }
            if (ej.contains(ei.cx, ei.cy)) {
              console.log(j, "contains", i);
              if (!(j in containments)) {
                containments[j] = [];
              }
              containments[j][i] = true;
            }
          }
        }
      });
    });

    this.intersections = intersections;
    this.containments = containments;
    this.intsByExE = intsByExE;
  }

  computeIntersectionsByEllipse() {
    var intsByE = {};
    this.intersections.forEach(((p, i) => {
      p.i = i;
      this.intsByExE[p.i1][p.i2].push(p);
      this.intsByExE[p.i2][p.i1].push(p);

      _.forEach(p.o, (o, j) => {
        if (!(j in intsByE)) {
          intsByE[j] = [];
        }
        intsByE[j].push(p);
      });
    }).bind(this));

    _.forEach(intsByE, (a, i) => {
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

    //console.log(intsByE);
    this.intsByE = intsByE;
  }

  computeEdgesByEllipse() {
    var allEdges = [];
    var edgesByE = {};
    _.forEach(this.intsByE, ((ints, i) => {
      var edges = ints.map((p1) => {
        var p2 = p1.o[i].next;
        var e = this.ellipses[i];
        if (!(i in edgesByE)) {
          edgesByE[i] = [];
        }
        var edge = new Edge({
          e: e,
          p1: p1,
          p2: p2,
          j: allEdges.length
        });
        allEdges.push(edge);
        return edge;
      });
      edges.forEach((edge, j) => {
        var n = edges.length;
        edge.prev = edges[(j-1+n)%n];
        edge.next = edges[(j+1)%n];
      });
      edgesByE[i] = edges;

      //console.log("i:", i, "\n\t" + ints.map((p, j) => {
      //        var edge = edges[j];
      //        var o = p.o[i];
      //        return r3(deg(o.t)) + ": " +
      //              r3(deg(o.prev.o[i].t)) + " " + r3(deg(o.next.o[i].t)) + ", (" +
      //              [edge.x1, edge.y1, deg(edge.t1)].map(r3).join(",") + ") (" +
      //              [edge.x2, edge.y2, deg(edge.t2)].map(r3).join(",") + ")";
      //      }).join("\n\t"));
    }).bind(this));

    //console.log(this.intersections.map((i) => { return i.toString(); }).join("\n"));

    this.edgesByE = edgesByE;
    this.edges = allEdges;
  }

  computeEdgeContainments() {
    // Compute ellipses containing each edge.

    var { ellipses, intsByE, containments } = this;

    _.forEach(this.edgesByE, ((edges, i) => {
      var e = this.ellipses[i];
      var ints = this.intsByE[i];
      var n = edges.length;

      var curIdx = 0;
      var since = 0;
      //var containers = new Set();
      var containers = {};
      while (since < n) {
        var curInt = ints[curIdx];
        var curEdge = edges[curIdx];
        var other = curInt.other(e);
        if (other.contains(curEdge.mp)) {
          containers[other.i] = true;
          //containers.add(other.i);
          if (!(other.i in curEdge.containers)) {
            //if (!curEdge.containers.has(other.i)) {
            since = 0;
          }
          //console.log("\t", other.i, "contains", curEdge.toString(), "since:", 0);
        } else {
          //containers[other.i] = false;
          //containers.delete(other.i);
          delete containers[other.i];
          since++;
          //console.log("\t", other.i, "doesn't contain", curEdge.toString());
        }
        //union(curEdge.containers, containers);
        //curEdge.containers.assign(containers);
        curEdge.containers = _.extend(curEdge.containers, containers);
        //console.log("set edge containers:", curEdge.toString(), keyStr(containers));
        curIdx = (curIdx + 1) % n;
      }
    }).bind(this));

    this.totalEdgeVisits = 0;

    _.forEach(this.edgesByE, ((edges, i) => {
      //var e = ellipses[i];
      edges.forEach((edge) => {
        this.containments[i].forEach((u, ci) => {
          console.log("noting", ci, "contains", edge.toString());
          edge.containers[ci] = true;
          //edge.containers.add(ci);
        });
        var keysStr = _.keys(edge.containers).sort().join(",");
        //console.log(edge.toString(), keysStr);
        //edge.containersKey = keysStr;
        if (_.isEmpty(edge.containers)) {
          this.totalEdgeVisits++;
        } else {
          this.totalEdgeVisits += 2;
        }
      });
    }).bind(this));
  }
};
