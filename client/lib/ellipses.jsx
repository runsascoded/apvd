
Ellipses = class {
  constructor(ellipses) {
    this.ellipses = ellipses;
    this.keys = _.keys(ellipses);
    this.n = this.keys.length;

    this.computeIntersections();
    this.computeIslands();
    this.computeIntersectionsByEllipse();
    this.computeEdgesByEllipse();
    this.computeEdgeContainments();
    this.computeRegions();

    //console.log(
    //      this.regions.map((r) => {
    //        return r.props.k + ": " + r.props.area + " (" + (r.props.area/pi) + ")";
    //      }).join("\n")
    //);

    //console.log(this.regions.map(ts).join("\n"));
  }

  computeIntersections() {
    var {ellipses, n, keys} = this;
    var intersections = [];
    var intsByE = {};
    var intsByExE = {};
    var containments = {};
    keys.forEach((i) => {
      containments[i] = {};
      intsByE[i] = [];
      intsByExE[i] = {};
    });
    var retry = false;
    for (var ii = 0; ii < n - 1; ii++) {
      var i = keys[ii];
      var ei = ellipses[i];
      for (var ji = ii + 1; ji < n; ji++) {
        var j = keys[ji];
        var ej = ellipses[j];

        var is = ei.intersect(ej);
        if (is.length) {
          is.forEach((int, k) => {
            int.i = intersections.length + k;
            intsByE[i].push(int);
            intsByE[j].push(int);
            if (!(j in intsByExE[i])) {
              intsByExE[i][j] = [];
            }
            intsByExE[i][j].push(int);
            if (!(i in intsByExE[j])) {
              intsByExE[j][i] = [];
            }
            intsByExE[j][i].push(int);
          });
          intersections = intersections.concat(is);
        } else {
          if (ei.containsEllipse(ej)) {
            //console.log(i, "contains", j);
            containments[i][j] = true;
          }
          if (ej.containsEllipse(ei)) {
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
              console.log("retrying:", ei.i, ej.i, ei, ej, ellipses);
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
      //console.log(intsByE, intsByExE);
      this.intsByE = intsByE;
      this.intsByExE = intsByExE;
    }
  }

  computeIntersectionsByEllipse() {
    var {intersections, intsByE} = this;

    // Add degenerate [0,2pi) edges for ellipses that don't intersect with any others.
    _.forEach(this.ellipses, (e, i) => {
      if (!intsByE[i].length) {
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

    // Sort each ellipse's intersections in order of a CCW tour of the ellipse's border,
    // starting from -pi.
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

  }

  computeIslands() {
    var {intsByExE, containments} = this;
    var intersectionClosures = {};
    _.forEach(intsByExE, (o, i) => {
      if (!(i in intersectionClosures)) {
        intersectionClosures[i] = {};
      }
      _.forEach(o, (u, j) => {
        intersectionClosures[i][j] = true;
        //console.log("adding:", j, "to", i, ";", kvs(intersectionClosures));
        if (j in intersectionClosures) {
          intersectionClosures[j] = _.extend(intersectionClosures[j], intersectionClosures[i]);
          _.forEach(intersectionClosures[j], (o, k) => {
            intersectionClosures[k] = intersectionClosures[j];
          });
          //console.log("post-extension:", kvs(intersectionClosures));
        } else {
          intersectionClosures[j] = intersectionClosures[i];
        }
      });
    });

    //console.log("closures:", kvs(intersectionClosures));

    var islands = {};
    _.forEach(this.ellipses, (e, i) => {
      islands[i] = {};
    });
    _.forEach(intsByExE, (o, i) => {
      var ints = intersectionClosures[i];
      _.forEach(containments, (u, j) => {
        if (containments[j][i] && !(j in ints)) {
          islands[i][j] = true;
        }
      });
    });

    //console.log(
    //      "islands:",
    //      _.map(islands, (v, k) => { return k + ": " + _.keys(v).join(""); }).join(", ")
    //);
    this.islands = islands;
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
        _.forEach(containments, (ci, j) => {
          if (ci[edge.i]) {
            //console.log("noting", j, "contains", edge.toString());
            edge.containers[j] = true;
          }
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

    var {intersections, containments, islands} = this;

    function traverse(point, region, prevUnusedEllipses, nonContainerRegion, startPoint, level) {
      function log() {
        var args = Array.prototype.slice.apply(arguments);
        var indent = "";
        for (var i = 0; i < level || 0; i++) {
          indent += "  ";
        }
        //console.log.apply(console, [indent].concat(args));
      }

      if (region && _.isEmpty(nonContainerRegion)) {
        return;
      }

      //console.log("traverse:", point.toString(), region);
      if (point == startPoint) {
        var regionKey = _.keys(region);
        var regionStr = regionKey.sort().join("");

        if (edges.length > 1) {
          var firstEdge = edges[0];
          var lastEdge = edges[edges.length - 1];
          if (firstEdge.e == lastEdge.e) {
            return;
          }
        }

        _.forEach(edges, (edge) => {
          edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
        });
        numEdgeVisits += edges.length;

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

          polygonArea =
                points.map((p, i) => {
                  var next = points[(i + 1) % n];
                  return p.x*next.y - p.y*next.x;
                }).reduce(sum) / 2;

          var secants = edges.map((edge, i) => {
            var point = points[i];
            var area = edge.secant;
            var ret = (edge.p1 == point) ? area : -area;
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

        var containers = {};
        if (regionKey.length > 1) {
          var containerKeys = _.keys(islands[edges[0].i]);
          if (containerKeys.length) {
            powerset(containerKeys).forEach((s) => {
              var k = s.join(',');
              containers[k] = true;
            });
          }
        }

        log("containers:", keyStr(containers));

        var addedRegions = [];
        powerset(regionKey).forEach((rk) => {
          var rs = rk.join(",");
          addedRegions.push(rs);
          if (!(rs in containers)) {
          //  if (rs == '0') {
          //  console.log("\tadding area:", regionArea/pi, "to", rs, ss(points), ss(edges));
            //}
            areasObj[rs] = (areasObj[rs] || 0) + regionArea;
          } else {
            log("skipping contained key:", rs);
          }
        });

        //console.log(
        //      "adding region:", regionStr,
        //      "to (" + addedRegions.join(" ") + ")",
        //      ss(points), ss(edges),
        //      r3(regionArea/pi)
        //      , r3(polygonArea/pi), r3(secantArea/pi)//, r3(regionArea)
        //);

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
        if (canVisit(edge) && edge.e != prevEllipse) {

          visitEdge(edge);
          var [ newRegion, lostEllipses, unusedEllipses ] =
                region ?
                      intersect(region, edge.ellipses) :
                      [ edge.ellipses, {}, {} ];

          if (region) {
            log(
                  "removing lost ellipses from ncr:",
                  keyStr(lostEllipses, ""),
                  keyStr(nonContainerRegion, "")
            );
            _.forEach(lostEllipses, (u, i) => {
              delete nonContainerRegion[i];
            });
          } else {
            nonContainerRegion = {};

            _.keys(edge.ellipses).forEach((i) => {
              nonContainerRegion[i] = true;
            });
            _.forEach(edge.ellipses, (e, i) => {
              //log("checking for islands:", i, islands[i]);
              _.forEach(islands[i], (u, j) => {
                //log("removing", j, "which islands", i);
                delete nonContainerRegion[j];
              });
            });
          }
          log("nonContainerRegion:", keyStr(nonContainerRegion));

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
                    nonContainerRegion,
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
      //console.log("traversing:", intersections[i].s(), numEdgeVisits, this.totalEdgeVisits);
      traverse(intersections[i]);
    }

    this.areasObj = areasObj;
    this.regions = regions;
  }
};
