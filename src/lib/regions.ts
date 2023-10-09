import * as apvd from "apvd";
import {Dual, Targets} from "apvd"
import {getRadii, S, Set, Shape} from "./shape";
import {PI} from "./math";
import {getMidpoint} from "./region";

export type Point = {
    x: number
    y: number
    edges: Edge[]
}

export type Errors = Map<string, apvd.Error>

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
        sets[idx] = { ...initialSets[idx], shape: makeShape(shape), }
    }))
    const newComponents = components.map(c => makeComponent(c, sets))
    const newComponentsMap = new Map(newComponents.map(c => [c.key, c]))
    // console.log("initial sets:", sets)
    const points = newComponents.flatMap(c => c.points)
    const edges = newComponents.flatMap(c => c.edges)
    const regions = newComponents.flatMap(c => c.regions)
    newComponents.forEach((newComponent, idx) => {
        const apvdComponent = components[idx]
        apvdComponent.regions.forEach((apvdRegion, regionIdx) => {
            const newRegion = newComponent.regions[regionIdx]
            // console.log("region:", apvdRegion, "children:", apvdRegion.child_component_keys)
            newRegion.childComponents = apvdRegion.child_component_keys.map(key => {
                const newComponent = newComponentsMap.get(key)
                if (!newComponent) throw Error(`no component with key ${key}; referenced in region ${apvdRegion.key} of component ${apvdComponent.key}`)
                return newComponent
            })
        })
    })
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

export function makeSegments(segments: apvd.Segment[], edges: Edge[]): Segment[] {
    return segments.map(({ edge_idx, fwd }) => ({
        edge: edges[edge_idx],
        fwd,
    }))
}

export function makeRegion(region: apvd.Region, allSets: S[], edges: Edge[]): Region {
    // console.log("makeRegion:", region)
    const segments = makeSegments(region.segments, edges)
    const containers = region.container_set_idxs.map(idx => allSets[idx])
    return {
        key: region.key,
        segments,
        area: region.area,
        containers,
        childComponents: [],
    }
}

export function makeComponent(component: apvd.Component, allSets: S[]): Component {
    // console.log("makeComponent:", component)
    const points: Point[] = component.points.map(({ p: { x, y }}) => ({
        x, y,
        edges: []
    }))
    const edges: Edge[] = component.edges.map(({ set_idx, node0_idx, node1_idx, theta0, theta1, container_idxs, is_component_boundary, }) => {
        const node0 = points[node0_idx]
        const node1 = points[node1_idx]
        if (!node0 || !node1) {
            throw Error(`node0 or node1 is null: ${node0_idx} ${node1_idx}, ${node0} ${node1}`)
        }
        return ({
            set: allSets[set_idx],
            node0: points[node0_idx],
            node1: points[node1_idx],
            theta0, theta1,
            containers: container_idxs.map(setIdx => allSets[setIdx]),
            isComponentBoundary: is_component_boundary,
        })
    })
    component.points.forEach(({ edge_idxs }, pointIdx) => {
        const point = points[pointIdx]
        point.edges = edge_idxs.map(edgeIdx => edges[edgeIdx])
    })
    const regions: Region[] = component.regions.map(r => makeRegion(r, allSets, edges))
    const sets = component.sets.map(({ idx }) => allSets[idx])
    const hull = makeSegments(component.hull, edges)
    return { key: component.key, sets, points, edges, regions, hull, }
}

export type Region = {
    key: string
    segments: Segment[]
    area: number
    containers: S[]
    childComponents: Component[]
}

export function regionPath({ segments, childComponents, }: { segments: Segment[], childComponents?: Component[] }): string {
    let d = ''
    segments.forEach(({edge, fwd}, idx) => {
        const { set: { shape }, node0, node1, theta0, theta1, } = edge
        const [rx, ry] = getRadii(shape)
        const theta = shape.kind === 'XYRRT' ? shape.t : 0
        const degrees = theta * 180 / PI
        const [startNode, endNode] = fwd ? [node0, node1] : [node1, node0]
        const start = { x: startNode.x, y: startNode.y }
        const end = { x: endNode.x, y: endNode.y }
        if (idx == 0) {
            d = `M ${start.x} ${start.y}`
        }
        // console.log("edge:", edge, "fwd:", fwd, "theta0:", theta0, "theta1:", theta1, "start:", start, "end:", end, "shape:", shape, "degrees:", degrees)
        if (segments.length == 1) {
            const mid = getMidpoint(edge, 0.4)
            d += ` A ${rx},${ry} ${degrees} 0 ${fwd ? 1 : 0} ${mid.x},${mid.y}`
            d += ` A ${rx},${ry} ${degrees} 1 ${fwd ? 1 : 0} ${end.x},${end.y}`
        } else {
            d += ` A ${rx},${ry} ${degrees} ${theta1 - theta0 > PI ? 1 : 0} ${fwd ? 1 : 0} ${end.x},${end.y}`
        }
    })
    if (childComponents?.length) {
        d += ` ${childComponents.map(c => regionPath({ segments: c.hull })).join(' ')}`
    }
    return d
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
    key: string
    sets: S[]
    points: Point[]
    edges: Edge[]
    regions: Region[]
    hull: Segment[]
}
