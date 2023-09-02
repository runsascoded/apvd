import * as apvd from "apvd";
import {Circle, Diagram, Dual, Errors, Input, Targets} from "apvd"

export type Point = {
    x: Dual
    y: Dual
    c0: C
    c1: C
    t0: Dual
    t1: Dual
    edges: Edge[]
}

export type Step = {
    inputs: Input[]
    regions: Regions
    targets: Targets
    total_target_area: number
    total_area: Dual
    errors: Errors
    error: Dual
}

export type Model = {
    steps: Step[]
    repeat_idx: number | null
    min_idx: number
    min_error: number
    lastDiagram: Diagram
}

export function makeModel(model: apvd.Model): Model {
    // console.log("makeModel:", model)
    const { steps, ...rest } = model
    const lastDiagram = model.steps[model.steps.length - 1]
    return {
        steps: steps.map(diagram => makeStep(diagram)),
        lastDiagram,
        ...rest,
    }
}

export function makeStep(diagram: Diagram): Step {
    // console.log("makeStep:", diagram)
    const { regions, ...rest } = diagram
    return { regions: makeRegions(regions), ...rest }
}

export function makeRegions(input: apvd.Regions): Regions {
    // console.log("makeRegions:", input)
    const shapes = input.shapes
    const points: Point[] = input.points.map(({ i: { x, y, c0idx, c1idx, t0, t1, } }) => ({
        x, y,
        c0: shapes[c0idx],
        c1: shapes[c1idx],
        t0, t1,
        edges: []
    }))
    const edges = input.edges.map(({ cidx, i0, i1, t0, t1, containers, containments }) => ({
        c: shapes[cidx],
        i0: points[i0],
        i1: points[i1],
        t0, t1,
        containers: containers.map(cidx => shapes[cidx]),
        containments,
    }))
    input.points.forEach(({ edge_idxs }, pointIdx) => {
        const point = points[pointIdx]
        point.edges = edge_idxs.map(edgeIdx => edges[edgeIdx])
    })
    const regions = input.regions.map(({ key, segments, area, container_idxs, container_bmp }) => ({
        key,
        segments: segments.map(({ edge_idx, fwd }) => ({
            edge: edges[edge_idx],
            fwd,
        })),
        area,
        containers: container_idxs.map(cidx => shapes[cidx]),
        container_bmp,
    }))
    return { shapes, points, edges, regions, }
}

export type C = Circle<number>

export type Region = {
    key: string
    segments: Segment[]
    area: Dual
    containers: C[]
    container_bmp: boolean[]
}

export interface Segment {
    edge: Edge;
    fwd: boolean;
}

export type Edge = {
    c: C;
    i0: Point;
    i1: Point;
    t0: number;
    t1: number;
    containers: C[];
    containments: boolean[];
}

export type Regions  = {
    shapes: C[]
    points: Point[]
    edges: Edge[]
    regions: Region[]
}
