
Ellipses = class {
  constructor(ellipses) {
    this.ellipses = ellipses;
    this.n = _.keys(ellipses).length;

    this.computeIntersections();
    this.computeIntersectionsByEllipse();
    this.computeEdgesByEllipse();
    this.computeEdgeContainments();
    this.computeRegions();

    areas = {};
    _.forEach(ellipses, ((e) => {
      this.regions.forEach((r) => {
        if (e.i in r.props.obj) {
          areas[e.i] = (areas[e.i] || 0) + r.props.area;
        }
      });
    }).bind(this));

    //console.log(areas);
    console.log(_.values(areas).map((v) => { return v / pi; }).map(r3).join(" "));

    //console.log(
    //      this.regions.map((r) => {
    //        return r.props.k + ": " + r.props.area + " (" + (r.props.area/pi) + ")";
    //      }).join("\n")
    //);

    //this.props.regions.forEach((r) => { console.log(r); });

    //console.log(this.regions.map(ts).join("\n"));
  }

  computeIntersections() {
    var {ellipses, n} = this;
    var intersections = [];
    var containments = [];
    for (var i = 0; i < n; i++) {
      containments[i] = [];
    }
    var retry = false;
    for (var i = 0; i < n - 1; i++) {
      var ei = ellipses[i];
      for (var j = i + 1; j < n; j++) {
        var ej = ellipses[j];

        //if (!(j in containments)) {
        //  containments[j] = [];
        //}

        var is = ei.intersect(ej);
        if (is.length) {
          intersections = intersections.concat(is);
        } else {
          if (ei.contains(ej.cx, ej.cy)) {
            //console.log(i, "contains", j);
            containments[i][j] = true;
          }
          if (ej.contains(ei.cx, ei.cy)) {
            containments[j][i] = true;
            if (containments[i][j]) {
              var t = Math.random() * tpi;
              var [c,s] = [Math.cos(t), Math.sin(t)];
              var eps = 1e-6;
              ellipses[i] = new Ellipse({
                cx: ei.cx + c*eps,
                cy: ei.cy + s*eps,
                rx: ei.rx,
                ry: ei.ry,
                theta: ei.theta,
                i: ei.i,
                color: ei.color
              });
              retry = true;
              console.log("retrying:", ellipses);
            }
          }
        }
      }
    }

    if (retry) {
      this.computeIntersections();
    } else {
      this.intersections = intersections;
      this.containments = containments;
    }
  }

  computeIntersectionsByEllipse() {
    var intsByE = {};
    var intersections = this.intersections;
    intersections.forEach((p, i) => {
      p.i = i;

      _.forEach(p.o, (o, j) => {
        if (!(j in intsByE)) {
          intsByE[j] = [];
        }
        intsByE[j].push(p);
      });
    });

    _.forEach(this.ellipses, (e, i) => {
      if (!(i in intsByE)) {
        var int = new Intersection({
          e1: e,
          e2: e,
          t1: 0,
          t2: 0
        });
        //console.log("adding:", int);
        intersections.push(int);
        intsByE[i] = [ int ];
      }
    });

    _.forEach(intsByE, (a, i) => {
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

    //console.log("edges:", ss(allEdges));

    this.edgesByE = edgesByE;
    this.edges = allEdges;
  }

  computeEdgeContainments() {
    // Compute ellipses containing each edge.

    var { ellipses, intsByE, edgesByE, containments } = this;

    _.forEach(edgesByE, (edges, i) => {
      var e = ellipses[i];
      var ints = intsByE[i];
      var n = edges.length;

      var curIdx = 0;
      var since = 0;
      var containers = {};
      while (since < n) {
        var curInt = ints[curIdx];
        var curEdge = edges[curIdx];
        var other = curInt.other(e);
        if (other != e && other.contains(curEdge.mp)) {
          containers[other.i] = true;
          if (!(other.i in curEdge.containers)) {
            since = 0;
          }
          //console.log("\t", other.i, "contains", curEdge.toString(), "since:", 0);
        } else {
          delete containers[other.i];
          since++;
          //console.log("\t", other.i, "doesn't contain", curEdge.toString());
        }
        curEdge.containers = _.extend(curEdge.containers, containers);
        //console.log("set edge containers:", curEdge.toString(), keyStr(containers));
        curIdx = (curIdx + 1) % n;
      }
    });

    this.totalEdgeVisits = 0;

    _.forEach(edgesByE, ((edges, i) => {
      edges.forEach((edge) => {
        containments[i].forEach((u, ci) => {
          console.log("noting", ci, "contains", edge.toString());
          edge.containers[ci] = true;
        });
        var keysStr = _.keys(edge.containers).sort().join(",");
        //console.log(edge.s(), keysStr);
        if (_.isEmpty(edge.containers)) {
          this.totalEdgeVisits++;
        } else {
          this.totalEdgeVisits += 2;
        }
      });
    }).bind(this));
  }

  computeRegions() {
    var areasObj = {};
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

      if (region && _.isEmpty(region)) {
        return;
      }

      //console.log("traverse:", point.toString(), region);
      if (point == startPoint) {
        var regionKey = _.keys(region);
        numEdgeVisits += regionKey.length;
        var regionStr = regionKey.sort().join("");

        if (edges.length > 1) {
          var firstEdge = edges[0];
          var lastEdge = edges[edges.length - 1];
          if (firstEdge.e == lastEdge.e) {
            return;
          }
        }

        //console.log(
        //      "region:", regionStr, regionKey, region, "\n\t" +
        //      points.map((p) => { return p.s(); }).join("\n\t")
        //      edges.map((e) => { return e.s(); }).join("\n\t")
        //);

        _.forEach(edges, (edge) => {
          edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
        });

        var n = points.length;
        var [ polygonArea, secantArea, regionArea ] = [ 0, 0, 0 ];
        if (n == 2) {
          var secants = edges.map((edge, i) => {
            var point = points[i];
            var area = edge.secant;
            return (edge.p1 == point) ? area : -area;
          });

          secantArea = secants.reduce(sum);
          regionArea = Math.abs(secantArea);
        } else {

          var [cx, cy] = [ 0, 0 ];
          points.forEach((p) => {
            cx += p.x;
            cy += p.y;
          });
          cx /= n;
          cy /= n;

          var clockwise = true;
          var prevT = null;
          for (var j = 0; j < n; j++) {
            var p = points[j];
            var [dx,dy] = [p.x - cx, p.y - cy];
            var r = sq(dx*dx + dy*dy);
            var t = Math.acos(dx/r);
            if (dy < 0) {
              t = -t;
            }
            if (prevT != null && t > prevT && t - prevT < pi) {
              clockwise = false;
              //console.log("\t", points[j-1].s(), "->", p.s(), prevT, "->", t );
              break;
            }
            prevT = t;
          }

          polygonArea =
                Math.abs(
                      points.map((p, i) => {
                        var next = points[(i + 1) % n];
                        return p.x*next.y - p.y*next.x;
                      }).reduce(sum) / 2
                );

          var secants = edges.map((edge, i) => {
            var point = points[i];
            var area = edge.secant;
            var ret = ((edge.p1 == point) != clockwise) ? area : -area;
            //console.log("\t", point.s(), edge.s(), area, ret, clockwise);
            return ret;
          });

          secantArea = secants.reduce(sum);
          regionArea = Math.abs(polygonArea + secantArea);
        }

        var r =
              <Region
                    k={regionStr}
                    edges={_.extend([], edges)}
                    points={_.extend([], points)}
                    i={regions.length}
                    key={regions.length}
                    width={3 / 50}
                    area={regionArea}
                    secantArea={secantArea}
                    polygonArea={polygonArea}
                    obj={region}
              />;

        powerset(regionKey).forEach((rk) => {
          var rs = rk.join(",");
          areasObj[rs] = (areasObj[rs] || 0) + regionArea;
        });
        //console.log(regionStr, ss(points), ss(edges), r3(polygonArea), r3(secantArea), r3(regionArea));

        regions.push(r);

        return;
      }
      if (point.i in visitedPoints) {
        return;
      }

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
          var [ newRegion, lostEllipses, unusedEllipses ] =
                region ?
                      intersect(region, edge.ellipses) :
                      [ edge.ellipses, {} ];
          log(
                "adding edge:", edge.s(), keyStr(edge.ellipses),
                "lost:", keyStr(lostEllipses), "unused:", keyStr(unusedEllipses)
          );

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

    this.areasObj = areasObj;
    this.regions = regions;
  }
};
