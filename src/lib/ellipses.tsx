import Region, {Containers, Props as RegionProps} from "./region";
import Edge from "./edge";
import Ellipse from "./ellipse";
import Intersection from "./intersection";
import {intersect, keyStr, powerset, ps, ss, sum, tpi} from "./utils";
import React, {ReactElement, ReactNode} from "react";

export const regionString = (r: ReactElement<RegionProps>) => ps(r.props.points, r.props.edges);
export const rts = regionString;


export default class Ellipses {
    ellipses: Ellipse[];
    keys: number[];
    n: number;
    intersections: Intersection[];
    containments: boolean[][];
    intsByE: Intersection[][];
    intsByExE: Intersection[][][];
    edges: Edge[];
    edgesByE: Edge[][];
    islands: boolean[][];
    areasObj: { [key: string]: number };
    regions: ReactNode[];

    constructor(ellipses: Ellipse[]) {
        this.ellipses = ellipses
        const keys: number[] = ellipses.map((e, idx) => {
            e.idx = idx
            return e.idx
        })
        const n = keys.length
        this.keys = keys
        this.n = n

    // ### computeIntersections

        const intsByE: Intersection[][] = [];  // Ellipse -> Intersection[]
        const intsByExE: Intersection[][][] = []  // Ellipse -> Ellipse -> Intersection[]
        const containments: boolean[][] = [];  // Ellipse -> Ellipse -> boolean

        // Initialize multi-level arrays
        keys.forEach((i) => {
            containments[i] = [];
            intsByE[i] = [];
            if (!(i in intsByExE)) {
                intsByExE[i] = []
            }
            keys.forEach(j => {
                if (i <= j) {
                    intsByExE[i][j] = []
                } else {
                    if (!(j in intsByExE)) {
                        intsByExE[j] = []
                    }
                    if (!(i in intsByExE)) {
                        throw new Error("intsByExE[" + i + "] is undefined")
                    }
                    if (!intsByExE[j][i]) {
                        throw new Error("intsByExE[" + i + "][" + j + "] is undefined")
                    }
                    intsByExE[i][j] = intsByExE[j][i]
                }
            })
        });

        let intersections: Intersection[] = [];
        for (let ii = 0; ii < n - 1; ii++) {
            const i = keys[ii];
            const ei = ellipses[i];
            for (let ji = ii + 1; ji < n; ji++) {
                const j = keys[ji];
                const ej = ellipses[j];

                const is = ei.intersect(ej);
                if (is.length) {
                    is.forEach((intersection, k) => {
                        intersection.idx = intersections.length + k;
                        intsByE[i].push(intersection);
                        intsByE[j].push(intersection);
                        intsByExE[i][j].push(intersection);
                    });
                    intersections = intersections.concat(is);
                } else {
                    if (ei.containsEllipse(ej)) {
                        //console.log(i, "contains", j);
                        containments[i][j] = true;
                        if (ej.containsEllipse(ei)) {
                            console.warn("ellipses", i, j, "mutually contain each other");
                        }
                    } else if (ej.containsEllipse(ei)) {
                        containments[j][i] = true;
                    }
                }
            }
        }

    // ### computeIntersectionsByEllipse()

        // Add degenerate [0,2pi) edges for ellipses that don't intersect with any others.
        this.ellipses.forEach((e, i) => {
            if (!intsByE[i].length) {
                const intersection = new Intersection({
                    e1: e, e2: e,
                    t1: 0, t2: 0
                });
                intersection.idx = intersections.length
                //console.log("adding:", int);
                intersections.push(intersection);
                intsByE[i] = [ intersection ];
            }
        });

        // Sort each ellipse's intersections in order of a CCW tour of the ellipse's border,
        // starting from -pi.
        intsByE.forEach((a, i) => {
            a.sort((i1, i2) => {
                return i1.polar(i).t - i2.polar(i).t;
            });
            const n = a.length;
            a.forEach((p, j) => {
                p.polar(i).next = a[(j+1)%n];
                p.polar(i).prev = a[(j-1+n)%n];
            });
        });

    // ### computeIslands()

        // Compute whether each ellipse is in a connected component with each other ellipse.
        const intersectionClosures: boolean[][] = []; // Ellipse -> Ellipse -> boolean
        intsByExE.forEach((o, i) => {
            if (!(i in intersectionClosures)) {
                intersectionClosures[i] = [];
            }
            o.forEach((u, j) => {
                if (!u.length || j in intersectionClosures[i]) return
                // Ellipses i and j are connected
                intersectionClosures[i][j] = true;
                //console.log("adding:", j, "to", i, ";", kvs(intersectionClosures));
                if (j in intersectionClosures) {
                    intersectionClosures[j].forEach((v, k) => {
                        intersectionClosures[i][k] = v
                        intersectionClosures[k] = intersectionClosures[i]
                    });
                    intersectionClosures[j] = intersectionClosures[i]
                    //console.log("post-extension:", kvs(intersectionClosures));
                } else {
                    intersectionClosures[j] = intersectionClosures[i]
                }
            });
        });

        //console.log("closures:", kvs(intersectionClosures));

        const islands: boolean[][] = [];
        keys.forEach(i => islands[i] = [])
        intsByExE.forEach((o, i) => {
            const ints = intersectionClosures[i];
            containments.forEach((u, j) => {
                if (containments[j][i] && !ints[j]) {
                    islands[i][j] = true;
                }
            });
        });

        //console.log(
        //      "islands:",
        //      _.map(islands, (v, k) => { return k + ": " + _.keys(v).join(""); }).join(", ")
        //);
        this.islands = islands;

    // ### computeEdgesByEllipse

        const allEdges: Edge[] = [];
        const edgesByE: Edge[][] = [];
        intsByE.forEach(
            (ints, i) => {
                const edges = ints.map((p1) => {
                    const p2 = p1.polar(i).next;
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
            }
        );
        //console.log(this.intersections.map((i) => { return i.toString(); }).join("\n"));
        //console.log("edges:", "\n" + ss(allEdges, "\n"));
        this.edgesByE = edgesByE;
        this.edges = allEdges;

    // ### computeEdgeContainments: compute ellipses containing each edge.

        edgesByE.forEach((edges, i) => {
            const e = ellipses[i];
            const ints = intsByE[i];
            const n = edges.length;

            let curIdx = 0;
            let since = 0;
            const containers: boolean[] = []
            while (since < n) {
                const curInt = ints[curIdx];
                const curEdge = edges[curIdx];
                const other = curInt.other(e);
                if (other !== e && other.contains(curEdge.mp)) {
                    containers[other.idx] = true;
                    if (!(other.idx in curEdge.containers)) {
                        since = 0;
                    }
                    //console.log("\t", other.i, "contains", curEdge.toString(), "since:", 0);
                } else {
                    delete containers[other.idx];
                    since++;
                    //console.log("\t", other.i, "doesn't contain", curEdge.toString());
                }
                containers.forEach((v, j) => curEdge.containers[j] = v)
                //console.log("set edge containers:", curEdge.toString(), keyStr(containers));
                curIdx = (curIdx + 1) % n;
            }
        });

        let totalEdgeVisits: number = 0;

        edgesByE.forEach(
            edges =>
                edges.forEach(edge => {
                    containments.forEach(
                        (ci, j) => {
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
                    totalEdgeVisits += edge.expectedEdgeVisits;
                })
        );

    // ### computeRegions

        const areasObj: { [k: string]: number } = {};
        const regions: ReactElement<RegionProps>[] = [];
        const visitedPoints: boolean[] = [];
        const regionEdgePairs: boolean[][] = [];
        const edges: Edge[] = [];
        const points: Intersection[] = [];
        const edgeVisits: number[] = [];

        function canVisit(edge: Edge) {
            return (edgeVisits[edge.j] || 0) < edge.expectedEdgeVisits;
        }

        let numEdgeVisits = 0;
        function visitEdge(edge: Edge) {
            edgeVisits[edge.j] = (edgeVisits[edge.j] || 0) + 1;
        }

        function unvisitEdge(edge: Edge) {
            edgeVisits[edge.j] = edgeVisits[edge.j] - 1;
        }

        function traverse(
            point: Intersection,
            region: boolean[] | null = null,
            prevUnusedEllipses: boolean[] = [],
            nonContainerRegion: boolean[] = [],
            startPoint?: Intersection,
            level?: number,
        ) {
            function log(...args: any[]) {
                let indent = "";
                for (let i = 0; i < (level || 0); i++) {
                    indent += "   ";
                }
                // console.log(indent, ...args)
            }

            if (region && (!nonContainerRegion || !Object.keys(nonContainerRegion).length)) {
                return;
            }
            // region = region || [];

            if (point === startPoint) {

                // First and last edges can't come from the same ellipse.
                if (edges.length > 1) {
                    const firstEdge = edges[0];
                    const lastEdge = edges[edges.length - 1];
                    if (firstEdge.e === lastEdge.e) {
                        return;
                    }
                }

                edges.forEach((e1) => {
                    edges.forEach((e2) => {
                        if (!(e1.j in regionEdgePairs)) {
                            regionEdgePairs[e1.j] = [];
                        }
                        regionEdgePairs[e1.j][e2.j] = true;
                    });
                });

                numEdgeVisits += edges.length;

                // Compute region area.
                const n = points.length;
                let [ polygonArea, secantArea, regionArea ] = [ 0, 0, 0 ];
                if (n === 2) {
                    const secants = edges.map((edge, i) => {
                        const point = points[i];
                        let area = edge.secant;
                        return (edge.p1 === point) ? area : -area;
                    });

                    secantArea = secants.reduce(sum);
                    regionArea = Math.abs(secantArea);
                } else {
                    polygonArea =
                        points.map((p, i) => {
                            const next = points[(i + 1) % n];
                            return p.x*next.y - p.y*next.x;
                        }).reduce(sum) / 2;

                    const secants = edges.map((edge, i) => {
                        const point = points[i];
                        const area = edge.secant;
                        return (edge.p1 === point) ? area : -area;
                    });

                    secantArea = secants.reduce(sum);
                    regionArea = Math.abs(polygonArea + secantArea);
                }

                const regionKey = Object.keys(region || []);
                const regionStr = regionKey.sort().join("");

                // "Island" containers -- those that contain this region and don't transitively intersect with any of the
                // ellipses whose edges bound this region -- need this region's area subtracted from their total area, because
                // each such ellipse will add up its own area without subtracting "islands" that it contains, resulting in
                // contained islands being double-counted towards the containers' area if we also add them here.
                //
                // The powerset of the set of island-containers all need to skip adding the current region's area for this
                // reason, i.e. if two ellipses both island-contain this region, each of them as well as their intersection will
                // inadvertently count this region's area on their own, and so should skip counting it here.
                const containers: Containers = {};
                if (regionKey.length > 1) {
                    const containerKeys = Object.keys(islands[edges[0].i]);
                    if (containerKeys.length) {
                        powerset(containerKeys).forEach(s => {
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
                        edges={[...edges]}
                        points={[...points]}
                        i={regions.length}
                        key={regions.length}
                        width={3 / 50}
                        area={regionArea}
                        secantArea={secantArea}
                        polygonArea={polygonArea}
                        // obj={region}
                    />;

                const addedRegions: string[] = [];
                powerset(regionKey).forEach((rk) => {
                    const rs = rk.join(",");
                    if (!(rs in containers)) {
                        addedRegions.push(rs);
                        areasObj[rs] = (areasObj[rs] || 0) + regionArea;
                    } else {
                        log("skipping contained key:", rs);
                    }
                });

                log(
                     "adding region:", regionStr,
                     "to (" + addedRegions.join(" ") + ")",
                     ps(points, edges),
                     // "area:", r3(regionArea/pi),
                     edgeVisits, numEdgeVisits, totalEdgeVisits
                );

                regions.push(r);
                return true;
            }
            if (point.idx === null) {
                throw new Error("point.idx is null")
            }
            if (point.idx in visitedPoints) {
                return;
            }

            const prevEllipse = edges.length ? edges[edges.length - 1].e : null;
            log("continuing point:", point.s(), keyStr(region || []), "existing points:", ss(points));
            visitedPoints[point.idx] = true;
            points.push(point);
            let found = false;
            for (let edgeIdx = 0; edgeIdx < point.edges.length; edgeIdx++) {
                const edge = point.edges[edgeIdx];

                const edgeNotSaturated = canVisit(edge);
                const differentEllipse = (edge.e !== prevEllipse);
                const edgeRegionPairs = regionEdgePairs[edge.j] || [];
                const notInRegionWithFirstEdge = (edges.length === 0 || !edgeRegionPairs[edges[0].j]);

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

                    const [ newRegion, lostEllipses, unusedEllipses ] =
                        region ?
                            intersect(region, edge.ellipses) :
                            [ edge.ellipses, [], [] ];

                    // Update nonContainerRegion
                    if (region) {
                        log(
                            "removing lost ellipses from ncr:",
                            keyStr(lostEllipses, ""),
                            keyStr(nonContainerRegion, "")
                        );
                        lostEllipses.forEach((v, i) => {
                            if (v)
                                delete nonContainerRegion[i];
                        });
                    } else {
                        nonContainerRegion = [];
                        edge.ellipses.forEach((v, i) => {
                            nonContainerRegion[i] = v;
                        });
                        edge.ellipses.forEach((_, i) => {
                            //log("checking for islands:", i, islands[i]);
                            islands[i].forEach((_, j) => {
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

                    if (edges.length >= 3 && lostEllipses.length) {
                        // If at least two edges precede this one and we just lost an ellipse E from the in-progress region, then the preceding ellipses all share containment by E while this one doesn't, meaning this is an invalid region; some other sibling edge to the current one must continue including E, and not including it means that edge cuts through the middle of the region we are currently building with the current edge, which is invalid.
                        log(
                             "lost ellipses:",
                             keyStr(lostEllipses),
                             ss(points.concat([edge.other(point)]))
                        );
                    } else {
                        const doublyUnused = intersect(unusedEllipses, prevUnusedEllipses || [])[0];
                        if (doublyUnused && Object.keys(doublyUnused).length) {
                            // A converse check to the above: if two consecutive edges are contained by an ellipse E that some earlier edge is not contained by (as evidenced by the current region not including E), then that earlier edge breaks the rule above of not dropping an ellipse that two consecutive edges are contained by, and the current region (with last edge) is invalid.
                            log(
                                 "doubly-unused ellipses:",
                                 keyStr(doublyUnused),
                                 ss(points.concat([edge.other(point)])),
                                 edge.e.idx, "vs.", prevEllipse?.idx
                            );
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
            delete visitedPoints[point.idx];
            points.pop();
            return found;
        }

        for (let i = 0; i < intersections.length && numEdgeVisits < totalEdgeVisits; i++) {
            traverse(intersections[i]);
        }

        if (numEdgeVisits < totalEdgeVisits) {
            console.error(
                "Fewer edge visits detected than expected: " +
                numEdgeVisits + " " +
                totalEdgeVisits +
                "\n" + regions.map(r => rts(r)).join("\n")
            );
        }

        // console.log("regions", regions.map(r => rts(r)).join("\n"))

        this.intersections = intersections
        this.containments = containments
        this.intsByE = intsByE
        this.intsByExE = intsByExE
        this.areasObj = areasObj
        this.regions = regions
    }
};
