import {R2} from "apvd-wasm";
import * as Shapes from "./shape"
import {pi2, pi4, sq3, sqrt} from "./math";
import {rotate} from "./shape";

export type Circle = {
    c: R2<number>
    r: number
}
export type Ellipse = {
    c: R2<number>
    r: R2<number>
    t?: number
}
export type Polygon = {
    vertices: R2<number>[]
}
export type Shape = Circle | Ellipse | Polygon

function isPolygon(s: Shape): s is Polygon {
    return 'vertices' in s
}

export const toShape = (s: Shape): Shapes.Shape<number> => {
    if (isPolygon(s)) {
        return { kind: 'Polygon', vertices: s.vertices }
    } else if (typeof s.r === 'number') {
        const { c, r } = s
        return { kind: 'Circle', c, r, }
    } else {
        const { c, r, t } = s as Ellipse
        if (t === undefined) {
            return { kind: 'XYRR', c, r, }
        } else {
            return { kind: 'XYRRT', c, r, t, }
        }
    }
}

export type InitialLayout = Shape[]

export const CirclesFlexible: InitialLayout = [
    { c: { x: -0.5, y:      0, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0  , y:  sq3/2, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0.5, y:      0, }, r: { x: 1, y: 1 }, t: 0 },
    { c: { x:  0  , y: -sq3/2, }, r: { x: 1, y: 1 }, t: 0 },
]

export const CirclesFixed: InitialLayout = [
    { c: { x: -0.5, y:      0, }, r: 1 },
    { c: { x:  0  , y:  sq3/2, }, r: 1 },
    { c: { x:  0.5, y:      0, }, r: 1 },
    { c: { x:  0  , y: -sq3/2, }, r: 1 },
]

export const Disjoint: InitialLayout = [
    { c: { x: 0, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 3, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 3, y: 3, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 0, y: 3, }, r: { x: 1, y: 1 }, t: 0, },
]

// TODO: if they actually share a center, the missing region penalty heuristics go to NaN
export const Nested: InitialLayout = [
    { c: { x: 0  , y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 0.5, y: 0, }, r: { x: 2, y: 2 }, t: 0, },
    { c: { x: 1  , y: 0, }, r: { x: 3, y: 3 }, t: 0, },
    { c: { x: 1.5, y: 0, }, r: { x: 4, y: 4 }, t: 0, },
]

export const SymmetricCircleLattice: InitialLayout = [
    { c: { x: 0, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 1, y: 0, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 1, y: 1, }, r: { x: 1, y: 1 }, t: 0, },
    { c: { x: 0, y: 1, }, r: { x: 1, y: 1 }, t: 0, },
    // { c: { x:   0, y: 1, }, r: { x: 2, y: 1, }, },
]

const r = 2
const r2 = r * r
const r2sq = sqrt(1 + r2)
let c0 = 1/r2sq
let c1 = r2 * c0
export const Ellipses4: InitialLayout = [
    { c: { x:   c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x: 1+c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x:   c1, y: 1+c0, }, r: { x: r, y: 1, }, },
    { c: { x:   c1, y:   c0, }, r: { x: r, y: 1, }, },
]

export const Ellipses4t: InitialLayout = [
    { c: rotate({ x:   c0, y:   c1, }, pi4), r: { x: 1, y: r, }, t: pi4, },
    { c: rotate({ x: 1+c0, y:   c1, }, pi4), r: { x: 1, y: r, }, t: pi4, },
    { c: rotate({ x:   c1, y: 1+c0, }, pi4), r: { x: r, y: 1, }, t: pi4, },
    { c: rotate({ x:   c1, y:   c0, }, pi4), r: { x: r, y: 1, }, t: pi4, },
]

export const Ellipses4t2: InitialLayout = [
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:     0 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:   pi4 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t:   pi2 },
    { c: { x: 0, y: 0 }, r: { x: 2, y: 1 }, t: 3*pi4 },
]

export const Repro: InitialLayout = [
    { c: { x: -1.100285308561806, y: -1.1500279763995946e-5 }, r: { x: 1.000263820108834, y: 1.0000709021402923 } },
    { c: { x: 0, y: 0, }, r: 1, },
]

export const TwoOverOne: InitialLayout = [
    { c: { x:  0. , y: 0. }, r: { x: 1., y: 3. } },
    { c: { x:  0.5, y: 1. }, r: { x: 1., y: 1. } },
    { c: { x: -0.5, y: 1. }, r: { x: 1., y: 1. } },
]

// Helper to generate regular polygon vertices
function regularPolygon(n: number, cx: number, cy: number, r: number, rotation: number = 0): Polygon {
    const vertices: R2<number>[] = []
    for (let i = 0; i < n; i++) {
        const angle = rotation + (2 * Math.PI * i) / n
        vertices.push({
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
        })
    }
    return { vertices }
}

// Helper to generate elongated hexagon (like an ellipse but with 6 vertices)
function elongatedHexagon(cx: number, cy: number, rx: number, ry: number, rotation: number = 0): Polygon {
    const vertices: R2<number>[] = []
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    for (let i = 0; i < 6; i++) {
        const angle = (2 * Math.PI * i) / 6
        // Generate point on axis-aligned ellipse, then rotate
        const px = rx * Math.cos(angle)
        const py = ry * Math.sin(angle)
        vertices.push({
            x: cx + px * cos - py * sin,
            y: cy + px * sin + py * cos,
        })
    }
    return { vertices }
}

// Example layouts with polygons
export const TriangleCircle: InitialLayout = [
    { c: { x: 0, y: 0 }, r: 1 },
    regularPolygon(3, 0, 0, 1.5, -Math.PI / 2),  // triangle pointing up
]

export const SquareCircle: InitialLayout = [
    { c: { x: 0, y: 0 }, r: 1 },
    regularPolygon(4, 0, 0, 1.5, Math.PI / 4),  // square rotated 45°
]

export const TwoTriangles: InitialLayout = [
    regularPolygon(3, 0, 0.3, 1.2, -Math.PI / 2),  // pointing up
    regularPolygon(3, 0, -0.3, 1.2, Math.PI / 2),  // pointing down
]

// Three overlapping pentagons in a triangular arrangement
export const ThreePentagons: InitialLayout = [
    regularPolygon(5, -0.6, -0.4, 1.0, -Math.PI / 2),
    regularPolygon(5, 0.6, -0.4, 1.0, -Math.PI / 2),
    regularPolygon(5, 0, 0.6, 1.0, -Math.PI / 2),
]

// Four overlapping hexagons in a square arrangement
export const FourHexagons: InitialLayout = [
    regularPolygon(6, -0.6, -0.6, 1.0, 0),
    regularPolygon(6, 0.6, -0.6, 1.0, 0),
    regularPolygon(6, 0.6, 0.6, 1.0, 0),
    regularPolygon(6, -0.6, 0.6, 1.0, 0),
]

// Three hexagons in triangular arrangement (ensures all 7 regions)
// Centers form equilateral triangle: top, bottom-left, bottom-right
const hexCenterDist = 0.8  // distance from origin to each center (must be < polygon radius for overlap)
export const ThreeHexagons: InitialLayout = [
    regularPolygon(6, 0, hexCenterDist, 1.0, Math.PI / 6),                                              // Top
    regularPolygon(6, -hexCenterDist * Math.cos(Math.PI / 6), -hexCenterDist * 0.5, 1.0, Math.PI / 6),  // Bottom-left
    regularPolygon(6, hexCenterDist * Math.cos(Math.PI / 6), -hexCenterDist * 0.5, 1.0, Math.PI / 6),   // Bottom-right
]

// Mixed: two pentagons and a hexagon
export const TwoPentagonsOneHexagon: InitialLayout = [
    regularPolygon(5, -0.5, 0, 1.0, -Math.PI / 2),
    regularPolygon(5, 0.5, 0, 1.0, -Math.PI / 2),
    regularPolygon(6, 0, 0.5, 1.0, 0),
]

// Helper to generate elongated n-gon (polygon approximating an ellipse)
function elongatedPolygon(n: number, cx: number, cy: number, rx: number, ry: number, rotation: number = 0): Polygon {
    const vertices: R2<number>[] = []
    const cos_r = Math.cos(rotation)
    const sin_r = Math.sin(rotation)
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n
        const px = rx * Math.cos(angle)
        const py = ry * Math.sin(angle)
        vertices.push({
            x: cx + px * cos_r - py * sin_r,
            y: cy + px * sin_r + py * cos_r,
        })
    }
    return { vertices }
}

// Four hexagons mimicking the 4-ellipse Venn layout
// Hexagons (6 sides) may not have enough vertices to achieve all 15 regions
const vennR = 2  // elongation ratio (same as ellipse layout)
export const FourHexagonsVenn: InitialLayout = [
    elongatedHexagon(c0, c1, 1, vennR),
    elongatedHexagon(1 + c0, c1, 1, vennR),
    elongatedHexagon(c1, 1 + c0, vennR, 1),
    elongatedHexagon(c1, c0, vennR, 1),
]

// Four 12-gons (dodecagons) - better ellipse approximation
export const FourDodecagonsVenn: InitialLayout = [
    elongatedPolygon(12, c0, c1, 1, vennR),
    elongatedPolygon(12, 1 + c0, c1, 1, vennR),
    elongatedPolygon(12, c1, 1 + c0, vennR, 1),
    elongatedPolygon(12, c1, c0, vennR, 1),
]

// Four 20-gons (icosagons) - close ellipse approximation, should achieve all 15 regions
export const FourIcosagonsVenn: InitialLayout = [
    elongatedPolygon(20, c0, c1, 1, vennR),
    elongatedPolygon(20, 1 + c0, c1, 1, vennR),
    elongatedPolygon(20, c1, 1 + c0, vennR, 1),
    elongatedPolygon(20, c1, c0, vennR, 1),
]
