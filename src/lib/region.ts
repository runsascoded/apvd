import {R2} from "@apvd/wasm";
import {Edge, Region, Segment} from "./regions";
import { atan2, cos, deg, sin, sqrt } from "./math";
import {getRadii, level, rotate, Shape} from "./shape";

export const getPointAtTheta = (shape: Shape<number>, theta: number): R2<number> => {
    switch (shape.kind) {
        case 'Circle': {
            const { c, r } = shape
            return {
                x: c.x + r * cos(theta),
                y: c.y + r * sin(theta),
            }
        }
        case 'XYRR': {
            const { c, r } = shape
            return {
                x: c.x + r.x * cos(theta),
                y: c.y + r.y * sin(theta),
            }
        }
        case 'XYRRT': {
            const xyrr = level(shape)
            const p = getPointAtTheta(xyrr, theta)
            return rotate(p, shape.t)
        }
        case 'Polygon': {
            // For polygons, theta is a perimeter coordinate: vertex i has coord i,
            // points along edge i→i+1 have coords in [i, i+1)
            const { vertices } = shape
            const n = vertices.length
            const edgeIdx = Math.floor(theta) % n
            const t = theta - Math.floor(theta)  // position along edge [0, 1)
            const v0 = vertices[edgeIdx]
            const v1 = vertices[(edgeIdx + 1) % n]
            return {
                x: v0.x * (1 - t) + v1.x * t,
                y: v0.y * (1 - t) + v1.y * t,
            }
        }
    }
}

export const getPointAndDirectionAtTheta = (shape: Shape<number>, theta: number): [R2<number>, number] => {
    switch (shape.kind) {
        case 'Circle': {
            const dx = shape.r * cos(theta)
            const dy = shape.r * sin(theta)
            return [
                {
                    x: shape.c.x + dx,
                    y: shape.c.y + dy,
                },
                atan2(dx, -dy),  // == atan2(dy, dx) + PI / 2
            ]
        }
        case 'XYRR': {
            const {x: rx, y: ry} = shape.r
            const dx = rx * cos(theta)
            const dy = ry * sin(theta)
            return [
                {
                    x: shape.c.x + dx,
                    y: shape.c.y + dy,
                },
                atan2(dx * ry * ry, -dy * rx * rx),
            ]
        }
        case 'XYRRT': {
            const xyrr = level(shape)
            const [p, d] = getPointAndDirectionAtTheta(xyrr, theta)
            return [rotate(p, shape.t), d + shape.t]
        }
        case 'Polygon': {
            // For polygons, theta is a perimeter coordinate
            const { vertices } = shape
            const n = vertices.length
            const edgeIdx = Math.floor(theta) % n
            const t = theta - Math.floor(theta)
            const v0 = vertices[edgeIdx]
            const v1 = vertices[(edgeIdx + 1) % n]
            const point = {
                x: v0.x * (1 - t) + v1.x * t,
                y: v0.y * (1 - t) + v1.y * t,
            }
            // Direction is the tangent (along the edge)
            const dx = v1.x - v0.x
            const dy = v1.y - v0.y
            const direction = atan2(dy, dx)
            return [point, direction]
        }
    }
}
export const getMidpoint = ({ set, node0, node1, theta0, theta1 }: Edge, f: number = 0.5): R2<number> => {
    if (set.shape.kind === 'Polygon') {
        // For polygon edges, linear interpolation between nodes
        return {
            x: node0.x * (1 - f) + node1.x * f,
            y: node0.y * (1 - f) + node1.y * f,
        }
    }
    return getPointAtTheta(
        set.shape,
        theta0 * (1 - f) + f * theta1,
    )
}

export const getEdgeLength = ({ set: { shape }, node0, node1, theta0, theta1 }: Edge) => {
    if (shape.kind === 'Polygon') {
        // For polygon edges, Euclidean distance between nodes
        const dx = node1.x - node0.x
        const dy = node1.y - node0.y
        return sqrt(dx * dx + dy * dy)
    }
    const radii = getRadii(shape)
    if (!radii) throw new Error(`Expected radii for shape kind ${shape.kind}`)
    const [rx, ry] = radii
    return sqrt(rx * ry) * (theta1 - theta0)  // TODO: this is approximate
}

export const getRegionCenter = ({ segments }: Region, fs: number[]) => {
    fs = fs || [ 0.5 ]
    let totalWeight = 0
    const points = ([] as { point: R2<number>, weight: number }[]).concat(
        ...segments.map(({ edge }) => {
            const weight = getEdgeLength(edge)
            // const weight = 1
            return fs.map(f => {
                totalWeight += weight
                return { point: getMidpoint(edge, f), weight }
            })
        }),
    )
    return {
        x: points.map(({ point: { x }, weight }) => weight * x).reduce((a,b)=>a+b) / totalWeight,
        y: points.map(({ point: { y }, weight }) => weight * y).reduce((a,b)=>a+b) / totalWeight,
    }
}

export type TextAnchor = "start" | "middle" | "end"
export type DominantBaseline = "middle" | "auto" | "hanging"
export type LabelAttrs = {
    textAnchor: TextAnchor
    dominantBaseline: DominantBaseline
}

/**
 * Compute the merged boundary path for regions matching a hover key.
 * Returns an SVG path string that outlines only the external edges (those bordering non-matching regions).
 *
 * @param regions All regions from curStep
 * @param matchFn Function that returns true if a region key matches the hover
 * @returns SVG path string for the merged boundary, or null if no matches
 */
export function computeMergedBoundaryPath(
    regions: Region[],
    matchFn: (key: string) => boolean,
): string | null {
    // Find all matching and non-matching region keys
    const matchingKeys = new Set<string>()
    const matchingRegions: Region[] = []
    for (const region of regions) {
        if (matchFn(region.key)) {
            matchingKeys.add(region.key)
            matchingRegions.push(region)
        }
    }

    if (matchingRegions.length === 0) return null

    // Build a map from edge identity to the regions on each side
    // An edge is "external" if one side is matching and the other is not
    // Edge identity: use node coordinates as key (since same edge appears in adjacent regions)
    type EdgeKey = string
    const edgeKey = (n0: R2<number>, n1: R2<number>): EdgeKey => {
        // Normalize order so same edge from either direction has same key
        if (n0.x < n1.x || (n0.x === n1.x && n0.y < n1.y)) {
            return `${n0.x.toFixed(10)},${n0.y.toFixed(10)}-${n1.x.toFixed(10)},${n1.y.toFixed(10)}`
        }
        return `${n1.x.toFixed(10)},${n1.y.toFixed(10)}-${n0.x.toFixed(10)},${n0.y.toFixed(10)}`
    }

    // Map edge -> list of region keys that use it
    const edgeToRegions = new Map<EdgeKey, string[]>()
    for (const region of regions) {
        for (const seg of region.segments) {
            const key = edgeKey(seg.edge.node0, seg.edge.node1)
            const list = edgeToRegions.get(key) || []
            list.push(region.key)
            edgeToRegions.set(key, list)
        }
    }

    // Collect external segments (edge borders both matching and non-matching region)
    const externalSegments: { seg: Segment, regionKey: string }[] = []
    for (const region of matchingRegions) {
        for (const seg of region.segments) {
            const key = edgeKey(seg.edge.node0, seg.edge.node1)
            const adjacentRegions = edgeToRegions.get(key) || []
            // Check if any adjacent region is non-matching
            const hasNonMatchingNeighbor = adjacentRegions.some(rk => !matchingKeys.has(rk))
            // Also external if it's a component boundary (outer edge of entire diagram)
            if (hasNonMatchingNeighbor || seg.edge.isComponentBoundary) {
                externalSegments.push({ seg, regionKey: region.key })
            }
        }
    }

    if (externalSegments.length === 0) return null

    // Build path from segments
    // For now, draw each segment individually (not chained into continuous paths)
    // TODO: chain segments for cleaner paths
    return externalSegments.map(({ seg }) => segmentToPath(seg)).join(' ')
}

/**
 * Convert a single segment to an SVG path fragment.
 */
function segmentToPath(seg: Segment): string {
    const { edge, fwd } = seg
    const { set: { shape }, node0, node1, theta0, theta1 } = edge
    const [startNode, endNode] = fwd ? [node0, node1] : [node1, node0]
    const start = { x: startNode.x, y: startNode.y }
    const end = { x: endNode.x, y: endNode.y }

    let d = `M ${start.x} ${start.y}`

    if (shape.kind === 'Polygon') {
        d += ` L ${end.x},${end.y}`
    } else {
        const radii = getRadii(shape)
        if (!radii) throw new Error(`Expected radii for shape kind ${shape.kind}`)
        const [rx, ry] = radii
        const theta = shape.kind === 'XYRRT' ? shape.t : 0
        const degrees = theta * 180 / Math.PI
        d += ` A ${rx},${ry} ${degrees} ${Math.abs(theta1 - theta0) > Math.PI ? 1 : 0} ${fwd ? 1 : 0} ${end.x},${end.y}`
    }

    return d
}

export type EdgeHighlightState = 'normal' | 'highlighted' | 'faded'

/**
 * Compute highlight state for each edge based on hovered region.
 * Returns a Map from edge key to highlight state.
 */
export function computeEdgeHighlightStates(
    edges: Edge[],
    regions: Region[],
    matchFn: ((key: string) => boolean) | null,
): Map<string, EdgeHighlightState> {
    const result = new Map<string, EdgeHighlightState>()

    // Helper to create a consistent edge key
    const edgeKey = (edge: Edge): string => {
        const n0 = edge.node0, n1 = edge.node1
        if (n0.x < n1.x || (n0.x === n1.x && n0.y < n1.y)) {
            return `${n0.x.toFixed(10)},${n0.y.toFixed(10)}-${n1.x.toFixed(10)},${n1.y.toFixed(10)}`
        }
        return `${n1.x.toFixed(10)},${n1.y.toFixed(10)}-${n0.x.toFixed(10)},${n0.y.toFixed(10)}`
    }

    // If no hover, all edges are normal
    if (!matchFn) {
        for (const edge of edges) {
            result.set(edgeKey(edge), 'normal')
        }
        return result
    }

    // Find matching region keys
    const matchingKeys = new Set<string>()
    for (const region of regions) {
        if (matchFn(region.key)) {
            matchingKeys.add(region.key)
        }
    }

    // Build map of edge -> regions that use it
    const edgeToRegions = new Map<string, string[]>()
    for (const region of regions) {
        for (const seg of region.segments) {
            const key = edgeKey(seg.edge)
            const list = edgeToRegions.get(key) || []
            list.push(region.key)
            edgeToRegions.set(key, list)
        }
    }

    // Determine state for each edge
    for (const edge of edges) {
        const key = edgeKey(edge)
        const adjacentRegions = edgeToRegions.get(key) || []

        // Check if edge has matching and non-matching neighbors
        const hasMatchingNeighbor = adjacentRegions.some(rk => matchingKeys.has(rk))
        const hasNonMatchingNeighbor = adjacentRegions.some(rk => !matchingKeys.has(rk))

        if (hasMatchingNeighbor && (hasNonMatchingNeighbor || edge.isComponentBoundary)) {
            // Edge is on the boundary of the highlighted region
            result.set(key, 'highlighted')
        } else {
            // Edge is not on the boundary - fade it
            result.set(key, 'faded')
        }
    }

    return result
}

/**
 * Generate SVG path string for a single edge.
 */
export function edgeToPath(edge: Edge): string {
    const { set: { shape }, node0, node1, theta0, theta1 } = edge
    const start = { x: node0.x, y: node0.y }
    const end = { x: node1.x, y: node1.y }

    let d = `M ${start.x} ${start.y}`

    if (shape.kind === 'Polygon') {
        d += ` L ${end.x},${end.y}`
    } else {
        const radii = getRadii(shape)
        if (!radii) throw new Error(`Expected radii for shape kind ${shape.kind}`)
        const [rx, ry] = radii
        const theta = shape.kind === 'XYRRT' ? shape.t : 0
        const degrees = theta * 180 / Math.PI
        // Always draw edge in forward direction (node0 to node1)
        d += ` A ${rx},${ry} ${degrees} ${Math.abs(theta1 - theta0) > Math.PI ? 1 : 0} 1 ${end.x},${end.y}`
    }

    return d
}

export function getLabelAttrs(theta: number): LabelAttrs {
    // Normal direction from label to edge of region
    const degrees = (deg(theta) + 540) % 360
    let textAnchor: TextAnchor = 'end'
    const textAnchorCutoffs: [ number, TextAnchor ][] = [
        [  67.5,    'end' ],
        [ 112.5, 'middle' ],
        [ 247.5,  'start' ],
        [ 292.5, 'middle' ],
    ]
    for (let [ k, v ] of textAnchorCutoffs) {
        if (degrees < k) {
            textAnchor = v
            break
        }
    }
    let dominantBaseline: DominantBaseline = 'middle'
    const dominantBaselineCutoffs: [ number, DominantBaseline ][] = [
        [  22.5,  'middle' ],
        [ 157.5, 'hanging' ],
        [ 202.5,  'middle' ],
        [ 337.5,    'auto' ],
    ]
    for (let [ k, v ] of dominantBaselineCutoffs) {
        if (degrees < k) {
            dominantBaseline = v
            break
        }
    }
    return { textAnchor, dominantBaseline }
}
