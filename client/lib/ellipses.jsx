
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
    const {ellipses, n, keys} = this;
    let intersections = [];
    const intsByE = {};
    const intsByExE = {};
    const containments = {};
    keys.forEach((i) => {
      containments[i] = {};
      intsByE[i] = [];
      intsByExE[i] = {};
    });
    let retry = false;
    for (let ii = 0; ii < n - 1; ii++) {
      var i = keys[ii];
      const ei = ellipses[i];
      for (let ji = ii + 1; ji < n; ji++) {
        const j = keys[ji];
        const ej = ellipses[j];

        const is = ei.intersect(ej);
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
              const t = Math.random() * tpi;
              const [c,s] = [Math.cos(t), Math.sin(t)];
              const eps = 1e-6;
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
        const int = new Intersection({
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
      const n = a.length;
      a.forEach((p, j) => {
        p.o[i].next = a[(j+1)%n];
        p.o[i].prev = a[(j-1+n)%n];
      });
    });

  }

  computeIslands() {
    var {intsByExE, containments} = this;
    const intersectionClosures = {};
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

    const islands = {};
    _.forEach(this.ellipses, (e, i) => {
      islands[i] = {};
    });
    _.forEach(intsByExE, (o, i) => {
      const ints = intersectionClosures[i];
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
    const allEdges = [];
    const edgesByE = {};
    _.forEach(this.intsByE, ((ints, i) => {
      const edges = ints.map((p1) => {
        const p2 = p1.o[i].next;
        const e = this.ellipses[i];
        if (!(i in edgesByE)) {
          edgesByE[i] = [];
        }
        const edge = new Edge({
          e: e,
          p1: p1,
          p2: p2,
          j: allEdges.length
        });
        allEdges.push(edge);
        return edge;
      });
      edges.forEach((edge, j) => {
        const n = edges.length;
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

    //console.log("edges:", "\n" + ss(allEdges, "\n"));

    this.edgesByE = edgesByE;
    this.edges = allEdges;
  }

  computeEdgeContainments() {
    // Compute ellipses containing each edge.

    var { ellipses, intsByE, edgesByE, containments, islands } = this;

    _.forEach(edgesByE, (edges, i) => {
      const e = ellipses[i];
      const ints = intsByE[i];
      const n = edges.length;

      let curIdx = 0;
      let since = 0;
      const containers = {};
      while (since < n) {
        const curInt = ints[curIdx];
        const curEdge = edges[curIdx];
        const other = curInt.other(e);
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

        //var keysStr = _.keys(edge.containers).sort().join(",");
        //console.log(edge.s(), keysStr);

        let onlyIslandContainers = true;
        for (let k in edge.containers) {
          if (!islands[edge.i][k]) {
            onlyIslandContainers = false;
            break;
          }
        }
        if (onlyIslandContainers) {
          edge.expectedEdgeVisits = 1;
        } else {
          edge.expectedEdgeVisits = 2;
        }
        this.totalEdgeVisits += edge.expectedEdgeVisits;
      });
    }).bind(this));
  }

  computeRegions() {
    const areasObj = {};
    const regions = [];
    const visitedPoints = {};
    const regionEdgePairs = {};
    const edges = [];
    const points = [];
    const edgeVisits = {};

    function canVisit(edge) {
      return (edgeVisits[edge.j] || 0) < edge.expectedEdgeVisits;
    }

    let numEdgeVisits = 0;
    function visitEdge(edge) {
      edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
    }

    function unvisitEdge(edge) {
      edgeVisits[edge.j] = edgeVisits[edge.j] - 1;
    }

    var {intersections, totalEdgeVisits, islands} = this;

    function traverse(point, region, prevUnusedEllipses, nonContainerRegion, startPoint, level) {
      function log() {
        const args = Array.prototype.slice.apply(arguments);
        let indent = "";
        for (let i = 0; i < level || 0; i++) {
          indent += "  ";
        }
        //console.log.apply(console, [indent].concat(args));
      }

      if (region && _.isEmpty(nonContainerRegion)) {
        return;
      }

      if (point == startPoint) {

        // First and last edges can't come from the same ellipse.
        if (edges.length > 1) {
          const firstEdge = edges[0];
          const lastEdge = edges[edges.length - 1];
          if (firstEdge.e == lastEdge.e) {
            return;
          }
        }

        edges.forEach((e1) => {
          edges.forEach((e2) => {
            if (!(e1.j in regionEdgePairs)) {
              regionEdgePairs[e1.j] = {};
            }
            regionEdgePairs[e1.j][e2.j] = true;
          });
        });

        numEdgeVisits += edges.length;

        // Compute region area.
        const n = points.length;
        var [ polygonArea, secantArea, regionArea ] = [ 0, 0, 0 ];
        if (n == 2) {
          var secants = edges.map((edge, i) => {
            const point = points[i];
            let area = edge.secant;
            return (edge.p1 == point) ? area : -area;
          });

          secantArea = secants.reduce(sum);
          regionArea = Math.abs(secantArea);
        } else {

          polygonArea =
                points.map((p, i) => {
                  const next = points[(i + 1) % n];
                  return p.x*next.y - p.y*next.x;
                }).reduce(sum) / 2;

          var secants = edges.map((edge, i) => {
            const point = points[i];
            const area = edge.secant;
            const ret = (edge.p1 == point) ? area : -area;
            return ret;
          });

          secantArea = secants.reduce(sum);
          regionArea = Math.abs(polygonArea + secantArea);
        }

        const regionKey = _.keys(region);
        const regionStr = regionKey.sort().join("");

        // "Island" containers -- those that contain this region and don't transitively intersect with any of the ellipses whose edges bound this region -- need this region's area subtracted from their total area, because each such ellipse will add up its own area without subtracting "islands" that it contains, resulting in contained islands being double-counted towards the containers' area if we also add them here.
        // The powerset of the set of island-containers all need to skip adding the current region's area for this reason, i.e. if two ellipses both island-contain this region, each of them as well as their intersection will inadvertently count this region's area on their own, and so should skip counting it here.
        const containers = {};
        if (regionKey.length > 1) {
          const containerKeys = _.keys(islands[edges[0].i]);
          if (containerKeys.length) {
            powerset(containerKeys).forEach((s) => {
              const k = s.join(',');
              containers[k] = true;
            });
          }
        }

        log("containers:", keyStr(containers));

        const r =
              <Region
                    k={regionStr}
                    containers={containers}
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

        const addedRegions = [];
        powerset(regionKey).forEach((rk) => {
          const rs = rk.join(",");
          if (!(rs in containers)) {
            addedRegions.push(rs);
            areasObj[rs] = (areasObj[rs] || 0) + regionArea;
          } else {
            log("skipping contained key:", rs);
          }
        });

        //console.log(
        //      "adding region:", regionStr,
        //      "to (" + addedRegions.join(" ") + ")",
        //      ps(points, edges),
        //      "area:", r3(regionArea/pi),
        //      edgeVisits, numEdgeVisits, totalEdgeVisits
        //);

        regions.push(r);
        return true;
      }
      if (point.i in visitedPoints) {
        return;
      }

      const prevEllipse = edges.length ? edges[edges.length - 1].e : null;
      log("continuing point:", point.s(), keyStr(region), "existing points:", ss(points));
      visitedPoints[point.i] = true;
      points.push(point);
      let found = false;
      for (let edgeIdx = 0; edgeIdx < point.edges.length; edgeIdx++) {
        var edge = point.edges[edgeIdx];

        const edgeNotSaturated = canVisit(edge);
        const differentEllipse = (edge.e != prevEllipse);
        const edgeRegionPairs = regionEdgePairs[edge.j] || {};
        const notInRegionWithFirstEdge = (edges.length == 0 || !edgeRegionPairs[edges[0].j]);

        log(
              "checking:",
              edge.s(),
              edgeNotSaturated,
              '(' + edge.j + ": " + edgeVisits[edge.j] + ')',
              "different ellipse:", differentEllipse,
              "not in region with first edge:", notInRegionWithFirstEdge, '(' + (edges.length ? edges[0].s() : '-') + ')'
        );

        if (edgeNotSaturated && differentEllipse && notInRegionWithFirstEdge) {

          visitEdge(edge);
          edges.push(edge);

          var [ newRegion, lostEllipses, unusedEllipses ] =
                region ?
                      intersect(region, edge.ellipses) :
                      [ edge.ellipses, {}, {} ];

          // Update nonContainerRegion
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

          //log("nonContainerRegion:", keyStr(nonContainerRegion));

          log(
                "adding edge:", edge.s(), keyStr(edge.ellipses),
                "lost:", keyStr(lostEllipses), "unused:", keyStr(unusedEllipses)
          );

          if (edges.length >= 3 && !_.isEmpty(lostEllipses)) {
            // If at least two edges precede this one and we just lost an ellipse E from the in-progress region, then the preceding ellipses all share containment by E while this one doesn't, meaning this is an invalid region; some other sibling edge to the current one must continue including E, and not including it means that edge cuts through the middle of the region we are currently building with the current edge, which is invalid.
            //console.log(
            //      "lost ellipses:",
            //      keyStr(lostEllipses),
            //      ss(points.concat([edge.other(point)]))
            //);
          } else {
            const doublyUnused = intersect(unusedEllipses, prevUnusedEllipses || {})[0];
            if (!_.isEmpty(doublyUnused)) {
              // A converse check to the above: if two consecutive edges are contained by an ellipse E that some earlier edge is not contained by (as evidenced by the current region not including E), then that earlier edge breaks the rule above of not dropping an ellipse that two consecutive edges are contained by, and the current region (with last edge) is invalid.
              //console.log(
              //      "doubly-unused ellipses:",
              //      keyStr(doublyUnused),
              //      ss(points.concat([edge.other(point)])),
              //      edge.e.i, "vs.", prevEllipse.i
              //);
            } else {
              if (traverse(
                    edge.other(point),
                    newRegion,
                    unusedEllipses,
                    nonContainerRegion,
                    startPoint || point,
                    (level || 0) + 1
              )) {
                found = true;
              }
            }
          }

          edges.pop();

          if (found) {
            if (edges.length >= 2) {
              break;
            }
            found = false;
          } else {
            unvisitEdge(edge);
          }
          log("removed edge:", edge.s(), edge.j, edgeVisits[edge.j]);
        }
      }
      delete visitedPoints[point.i];
      points.pop();
      return found;
    }

    for (var i = 0; i < intersections.length && numEdgeVisits < totalEdgeVisits; i++) {
      traverse(intersections[i]);
    }

    if (numEdgeVisits < totalEdgeVisits) {
      console.error(
            "Fewer edge visits detected than expected: " +
            numEdgeVisits + " " +
            totalEdgeVisits +
            "\n" + regions.map(rts).join("\n")
      );
    }

    this.areasObj = areasObj;
    this.regions = regions;
  }
};
