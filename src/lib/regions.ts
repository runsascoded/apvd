import * as apvd from "apvd";
import {Dual, Error, Targets} from "apvd"
import {S, Set, Shape} from "./shape";

export type Point = {
    x: Dual
    y: Dual
    edges: Edge[]
}

export type Errors = Map<string, Error>

export type Step = {
    sets: S[]
    points: Point[]
    edges: Edge[]
    regions: Region[]
    components: Component[]
    targets: Targets<number>
    total_area: Dual
    errors: Errors
    error: Dual
}

export type Model = {
    steps: Step[]
    repeat_idx: number | null
    min_idx: number
    min_error: number
    lastStep: Step
    raw: apvd.Model
}

export function makeModel(model: apvd.Model, initialSets: Set[]): Model {
    // console.log("makeModel:", model)
    const { steps, ...rest } = model
    const newSteps = steps.map(step => makeStep(step, initialSets))
    const lastStep = newSteps[newSteps.length - 1]
    return {
        steps: newSteps,
        lastStep,
        raw: model,
        ...rest,
    }
}

export function makeStep(step: apvd.Step, initialSets: Set[]): Step {
    // console.log("makeStep:", step)
    const { components, errors, ...rest } = step
    const sets: S[] = []
    components.forEach(c => c.sets.forEach(({ idx, shape }) => {
        sets[idx] = { ...initialSets[idx], shape: makeShape(shape) }
    }))
    const newComponents = components.map(c => makeComponent(c, sets))
    // console.log("initial sets:", sets)
    const points = newComponents.flatMap(c => c.points)
    const edges = newComponents.flatMap(c => c.edges)
    const regions = newComponents.flatMap(c => c.regions)
    return {
        sets,
        points,
        edges,
        regions,
        components: newComponents,
        // tsify `#[declare]` erroneously emits Record<K, V> instead of Map<K, V>: https://github.com/madonoharu/tsify/issues/26
        errors: errors as any as Errors,
        ...rest
    }
}

export function makeShape(shape: apvd.Shape<number>): Shape<number> {
    if ('Circle' in shape) {
        const { c, r } = shape.Circle
        return { kind: 'Circle', c, r, }
    } else if ('XYRR' in shape) {
        const { c, r } = shape.XYRR
        return { kind: 'XYRR', c, r, }
    } else {
        const { c, r, t } = shape.XYRRT
        return { kind: 'XYRRT', c, r, t, }
    }
}

export function makeComponent(component: apvd.Component, allSets: S[]): Component {
    // console.log("makeComponent:", component)
    const points: Point[] = component.points.map(({ p: { x, y }}) => ({
        x, y,
        edges: []
    }))
    const edges: Edge[] = component.edges.map(({ set_idx, node0_idx, node1_idx, theta0, theta1, container_idxs, is_component_boundary, }) => ({
        set: allSets[set_idx],
        node0: points[node0_idx],
        node1: points[node1_idx],
        theta0, theta1,
        containers: container_idxs.map(setIdx => allSets[setIdx]),
        isComponentBoundary: is_component_boundary,
    }))
    component.points.forEach(({ edge_idxs }, pointIdx) => {
        const point = points[pointIdx]
        point.edges = edge_idxs.map(edgeIdx => edges[edgeIdx])
    })
    const regions: Region[] = component.regions.map(({ key, segments, area, container_idxs }) => ({
        key,
        segments: segments.map(({ edge_idx, fwd }) => ({
            edge: edges[edge_idx],
            fwd,
        })),
        area,
        containers: container_idxs.map((cidx: number) => allSets[cidx]),
    }))
    return { sets: component.sets.map(({ idx }) => allSets[idx]), points, edges, regions, }
}

export type Region = {
    key: string
    segments: Segment[]
    area: Dual
    containers: S[]
}

export interface Segment {
    edge: Edge;
    fwd: boolean;
}

export type Edge = {
    set: S
    node0: Point
    node1: Point
    theta0: number
    theta1: number
    containers: S[]
    isComponentBoundary: boolean
}

export type Component = {
    sets: S[]
    points: Point[]
    edges: Edge[]
    regions: Region[]
}
