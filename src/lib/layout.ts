import {R2} from "@apvd/wasm";
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

// Non-convex blob polygon for 5-set Venn diagrams.
// Mild cardioid (limacon) shape: r = 1 + dent * cos(theta)
// - dent > 0 makes the shape wider at the pole (outer tip) and narrower
//   at the anti-pole (inner side facing center), creating a gentle concavity.
// - Combined with elongation (height > width) this creates the kidney/bean
//   shapes seen in Zhang 2014's 5-set Venn diagrams.
function blobPolygon(
    n: number,
    cx: number, cy: number,
    width: number, height: number,
    dent: number,
    rotation: number = 0,
): Polygon {
    const vertices: R2<number>[] = []
    const cos_r = Math.cos(rotation)
    const sin_r = Math.sin(rotation)
    for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / n
        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const r = 1 + dent * cosT
        const px = sinT * width * r
        const py = cosT * height * r
        vertices.push({
            x: cx + px * cos_r - py * sin_r,
            y: cy + px * sin_r + py * cos_r,
        })
    }
    return { vertices }
}

// Elongation ratio for Venn-style layouts (same as ellipse layout)
const vennR = 2

// Four pentagons (5-gons) in the 4-ellipse Venn pattern
export const FourPentagons: InitialLayout = [
    elongatedPolygon(5, c0, c1, 1, vennR),
    elongatedPolygon(5, 1 + c0, c1, 1, vennR),
    elongatedPolygon(5, c1, 1 + c0, vennR, 1),
    elongatedPolygon(5, c1, c0, vennR, 1),
]

// Four hexagons (6-gons) in the 4-ellipse Venn pattern
export const FourHexagons: InitialLayout = [
    elongatedPolygon(6, c0, c1, 1, vennR),
    elongatedPolygon(6, 1 + c0, c1, 1, vennR),
    elongatedPolygon(6, c1, 1 + c0, vennR, 1),
    elongatedPolygon(6, c1, c0, vennR, 1),
]

// Four octagons (8-gons) in the 4-ellipse Venn pattern
export const FourOctagons: InitialLayout = [
    elongatedPolygon(8, c0, c1, 1, vennR),
    elongatedPolygon(8, 1 + c0, c1, 1, vennR),
    elongatedPolygon(8, c1, 1 + c0, vennR, 1),
    elongatedPolygon(8, c1, c0, vennR, 1),
]

// Four 12-gons (dodecagons) - better ellipse approximation
export const FourDodecagons: InitialLayout = [
    elongatedPolygon(12, c0, c1, 1, vennR),
    elongatedPolygon(12, 1 + c0, c1, 1, vennR),
    elongatedPolygon(12, c1, 1 + c0, vennR, 1),
    elongatedPolygon(12, c1, c0, vennR, 1),
]

// Four 20-gons (icosagons) - close ellipse approximation, should achieve all 15 regions
export const FourIcosagons: InitialLayout = [
    elongatedPolygon(20, c0, c1, 1, vennR),
    elongatedPolygon(20, 1 + c0, c1, 1, vennR),
    elongatedPolygon(20, c1, 1 + c0, vennR, 1),
    elongatedPolygon(20, c1, c0, vennR, 1),
]

// =============================================================================
// 5-shape layouts: pentagonal arrangement for 31-region Venn diagrams
// =============================================================================

// 5-blob layout: mild cardioid blobs arranged on a pentagon.
// Each blob's +y axis (outer tip) points outward from the diagram center.
function fiveBlobLayout(
    n: number, dist: number,
    width: number, height: number,
    dent: number,
): InitialLayout {
    return Array.from({ length: 5 }, (_, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / 5
        const cx = dist * Math.cos(angle)
        const cy = dist * Math.sin(angle)
        return blobPolygon(n, cx, cy, width, height, dent, angle)
    })
}

// Five 12-gon cardioid blobs (parametric starting point)
export const FiveBlobs12: InitialLayout = fiveBlobLayout(12, 0.10, 0.70, 1.3, 0.25)

// Five 15-gon cardioid blobs (parametric starting point)
export const FiveBlobs: InitialLayout = fiveBlobLayout(15, 0.15, 1.40, 2.1, 0.15)

// Replicate a template polygon 5× via 72° rotations (matching Rust layout_opt).
function fiveFromTemplate(template: R2<number>[]): InitialLayout {
    return Array.from({ length: 5 }, (_, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / 5
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return {
            vertices: template.map(v => ({
                x: v.x * cos - v.y * sin,
                y: v.x * sin + v.y * cos,
            }))
        }
    })
}

// Optimized 12-gon template (radial parameterization, 2000 steps)
// min/total=2.81%, loss=8.3e-5 (not fully converged, 12 vertices may be insufficient)
export const FiveBlobs12Opt: InitialLayout = fiveFromTemplate([
    { x: +0.000000, y: +0.708513 },
    { x: +0.135692, y: +0.235026 },
    { x: +0.375308, y: +0.216684 },
    { x: +0.070803, y: +0.000000 },
    { x: +0.316522, y: -0.182744 },
    { x: +0.300825, y: -0.521044 },
    { x: +0.000000, y: -0.096645 },
    { x: -0.275279, y: -0.476797 },
    { x: -0.183135, y: -0.105733 },
    { x: -0.056255, y: -0.000000 },
    { x: -0.339773, y: +0.196168 },
    { x: -0.144770, y: +0.250750 },
])

// Optimized 15-gon template (radial parameterization, 2000 steps)
// All 31 regions equal area (3.2258% each), loss=7.4e-23
export const FiveBlobs15Opt: InitialLayout = fiveFromTemplate([
    { x: +0.000000, y: +1.308383 },
    { x: +0.548921, y: +1.232896 },
    { x: +0.798618, y: +0.719079 },
    { x: +0.253762, y: +0.082452 },
    { x: +0.142250, y: -0.014951 },
    { x: +0.781661, y: -0.451292 },
    { x: +0.607416, y: -0.836036 },
    { x: +0.099147, y: -0.466452 },
    { x: -0.206830, y: -0.973058 },
    { x: -0.754323, y: -1.038237 },
    { x: -1.223385, y: -0.706322 },
    { x: -0.202345, y: -0.021267 },
    { x: -0.749854, y: +0.243642 },
    { x: -1.170053, y: +1.053520 },
    { x: -0.497034, y: +1.116356 },
])
