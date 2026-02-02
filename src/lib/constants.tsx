import React from "react"
import A from "../components/A"
import { ValItem } from "../types"
import {
    CirclesFixed, CirclesFlexible, Disjoint, Ellipses4, Ellipses4t,
    FourDodecagons, FourHexagons, FourIcosagons, FourOctagons, FourPentagons,
    InitialLayout, Nested, ThreeHexagons, ThreePentagons, toShape,
    TriangleCircle, TwoPentagonsOneHexagon, TwoTriangles
} from "./layout"

// Re-export default layout for use in App.tsx
export { Ellipses4t }

// Session/local storage keys
export const initialLayoutKey = "initialLayout"
export const shapesKey = "shapes"
export const targetsKey = "targets"
export const setMetadataKey = "setMetadata"

export const MaxNumShapes = 5

export const GridId = "grid"

// External links
export const VariantCallersPaperLink = <A href={"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf"}>Roberts et al (2013)</A>
export const fizzBuzzLink = <A href={"https://en.wikipedia.org/wiki/Fizz_buzz"}>Fizz Buzz</A>

// Layout configurations
export const layouts: ValItem<InitialLayout>[] = [
    { name: "Ellipses", val: Ellipses4t, description: "4 ellipses intersecting to form all 15 possible regions, rotated -45°", },
    { name: "Ellipses (axis-aligned)", val: Ellipses4, description: "Same as above, but ellipse axes are horizontal/vertical (and rotation is disabled)", },
    { name: "Circles (flexible)", val: CirclesFlexible, description: "4 ellipses, initialized as circles, and oriented in a diamond configuration, such that 2 different subsets (of 3) are symmetric, and 11 of 15 possible regions are represented (missing 2 4C2's and 2 4C3's).", },
    { name: "Circles (fixed)", val: CirclesFixed, description: "4 circles, initialized in a diamond as in \"Circles (flexible)\" above, but these are fixed as circles (rx and ry remain constant, rotation is immaterial)", },
    { name: "Disjoint", val: Disjoint, description: "4 disjoint circles. When two (or more) sets are supposed to intersect, but don't, a synthetic penalty is added to the error computation, which is proportional to: 1) each involved set's distance to the centroid of the centers of the sets that are supposed to intersect, as well as 2) the size of the target subset. This \"disjoint\" initial layout serves demonstrate/test this behavior. More sophisticated heuristics would be useful here, as the current scheme is generally insufficient to coerce all sets into intersecting as they should." },
    { name: "Nested", val: Nested, description: "4 nested circles, stresses disjoint/contained region handling, which has known issues!" },
    // Polygon layouts
    { name: "Triangle + Circle", val: TriangleCircle, description: "A circle and an overlapping triangle (polygon test)" },
    { name: "Two Triangles", val: TwoTriangles, description: "Two overlapping triangles (Star of David pattern)" },
    { name: "Three Pentagons", val: ThreePentagons, description: "Three overlapping pentagons in a triangular arrangement" },
    { name: "Three Hexagons", val: ThreeHexagons, description: "Three hexagons in a triangular arrangement" },
    { name: "Four 5-gons", val: FourPentagons, description: "Four elongated pentagons" },
    { name: "Four 6-gons", val: FourHexagons, description: "Four elongated hexagons" },
    { name: "Four 8-gons", val: FourOctagons, description: "Four elongated octagons" },
    { name: "Four 12-gons", val: FourDodecagons, description: "Four elongated dodecagons" },
    { name: "Four 20-gons", val: FourIcosagons, description: "Four elongated icosagons" },
    { name: "2 Pentagons + Hexagon", val: TwoPentagonsOneHexagon, description: "Two pentagons and a hexagon (mixed polygon test)" },
]
