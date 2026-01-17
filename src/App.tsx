import Grid, { GridState } from "./components/grid"
import React, { DetailedHTMLProps, Fragment, HTMLAttributes, lazy, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ShortcutsModal, Omnibar, SequenceModal, useAction } from 'use-kbd'
import * as apvd from "apvd"
import { train, update_log_level } from "apvd"
import { makeModel, Model, Region, regionPath, Step } from "./lib/regions"
import { Point } from "./components/point"
import css from "./App.module.scss"
import A from "./components/A"
import Button from 'react-bootstrap/Button'
import OverlayTrigger, { OverlayTriggerProps } from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { entries, mapEntries, values } from "./lib/objs"
import { getSliderValue } from "./components/inputs"
import { cos, max, min, PI, pi2, round, sin, sq3 } from "./lib/math"
import Apvd, { LogLevel } from "./components/apvd"
import { getLabelAttrs, getMidpoint, getPointAndDirectionAtTheta, getRegionCenter, LabelAttrs } from "./lib/region"
import { BoundingBox, DefaultSetMetadata, getRadii, mapShape, S, SetMetadata, setMetadataParam, Shape, shapeBox, Shapes, shapesParam, shapeStrJS, shapeStrJSON, shapeStrRust } from "./lib/shape"
import { TargetsTable } from "./components/tables/targets"
import { makeTargets, Target, Targets, targetsParam } from "./lib/targets"
import { CirclesFixed, CirclesFlexible, Disjoint, Ellipses4, Ellipses4t, InitialLayout, Nested, toShape } from "./lib/layout"
import { VarsTable } from "./components/tables/vars"
import { SparkLineProps } from "./components/spark-lines"
import { CircleCoords, Coord, makeVars, Vars, XYRRCoords, XYRRTCoords } from "./lib/vars"
import { CopyCoordinatesType, ShapesTable } from "./components/tables/shapes"
import _ from "lodash"
import debounce from "lodash/debounce"
import { getHashMap, getHistoryStateHash, HashMapVal, Param, ParsedParam, parseHashParams, updatedHash, updateHashParams } from "./lib/params"
import { precisionSchemes, ShapesParam } from "./lib/shapes-buffer"
import { Checkbox, Control, Number, Select } from "./components/controls"
import useSessionStorageState from "use-session-storage-state"
import { useTheme } from "./components/theme-toggle"
import { Fab } from "./components/fab"
import ClipboardSvg from "./components/clipboard-svg"
import { fmt } from "./lib/utils"
import { useDeepCmp } from "./lib/use-deep-cmp-memo"
import d3ToPng from "d3-svg-to-png"
import { EditableText } from "./components/editable-text"
import { FizzBuzzBazz, MPowerLink, Zhang2014Href } from "./lib/sample-targets"
import { Placement } from "react-bootstrap/types"

const Plot = lazy(() => import("react-plotly.js"))

export type RunningState = "none" | "fwd" | "rev"

export type LabelPoint = Point & LabelAttrs & { setIdx: number, point: Point }

export function Details({ open, toggle, summary, className, children, }: {
    open: boolean
    toggle: (open: boolean) => void
    summary?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <details
            className={className || ''}
            open={open}
            onToggle={e => toggle((e.currentTarget as HTMLDetailsElement).open)}
        >
            {summary && <summary>{summary}</summary>}
            {children}
        </details>
    )
}

export function DetailsSection({ title, tooltip, open, toggle, className, children, ...rest }: {
    title: string
    tooltip?: ReactNode
    open: boolean
    toggle: (open: boolean) => void
    className?: string
    children: ReactNode
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
    return (
        <div className={css.detailsSection} {...rest}>
            <Details open={open} toggle={toggle} className={className}>
                <summary>
                    <h4 className={css.tableTitle}>{
                        tooltip
                            ? <OverlayTrigger overlay={<Tooltip>{tooltip}</Tooltip>}><span>{title}</span></OverlayTrigger>
                            : title
                    }</h4>
                </summary>
                {children}
            </Details>
        </div>
    )
}

export type ValItem<Val> = { name: string, val: Val, description: ReactNode }
export type LinkItem = { name: string, children: ReactNode, description: ReactNode }
export function Links({ links, placement, }: { links: LinkItem[], placement: Placement }): [ () => void, ReactNode ] {
    const [ showTooltip, setShowTooltip ] = useState<string | null>(null)
    return [
        () => setShowTooltip(null),
        <ul style={{ listStyle: "none", }}>{
            links.map(({ name, description, children }, idx) => {
                const overlay = <Tooltip onClick={e => console.log("tooltip click:", name)}>{description}</Tooltip>
                // const isCurVal = _.isEqual(cur, val)
                // console.log("link:", isCurVal, cur, val)
                return (
                    <li key={idx}>
                        <OverlayTrigger
                            trigger={["focus", "click"]}
                            onToggle={shown => {
                                if (shown) {
                                    console.log("showing:", name)
                                    setShowTooltip(name)
                                } else if (name == showTooltip) {
                                    console.log("hiding:", name)
                                    setShowTooltip(null)
                                }
                            }}
                            show={name == showTooltip}
                            placement={placement}
                            overlay={overlay}
                        >
                            <span
                                className={css.info}
                                style={{ opacity: name == showTooltip ? 0.5 : 1 }}
                                onClick={e => {
                                    console.log("info click:", name, name == showTooltip)
                                    e.stopPropagation()
                                }}
                            >ℹ️</span>
                        </OverlayTrigger>
                        {' '}
                        <span onClick={() => { setShowTooltip(null) }}>{children}</span>
                    </li>
                )
            })
        }</ul>
    ]
}

export const GridId = "grid"

export default function Page() {
    return (
        <Apvd>{() => <>
            <Body />
            <ShortcutsModal groups={{
                playback: 'Playback',
                nav: 'Navigation',
            }} />
            <Omnibar placeholder="Search actions..." />
            <SequenceModal />
        </>}</Apvd>
    )
}

declare var window: any;

export const initialLayoutKey = "initialLayout"
export const shapesKey = "shapes"
export const targetsKey = "targets"
export const setMetadataKey = "setMetadata"

export const VariantCallersPaperLink = <A href={"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf"}>Roberts et al (2013)</A>

const layouts: ValItem<InitialLayout>[] = [
    { name: "Ellipses", val: Ellipses4t, description: "4 ellipses intersecting to form all 15 possible regions, rotated -45°", },
    { name: "Ellipses (axis-aligned)", val: Ellipses4, description: "Same as above, but ellipse axes are horizontal/vertical (and rotation is disabled)", },
    { name: "Circles (flexible)", val: CirclesFlexible, description: "4 ellipses, initialized as circles, and oriented in a diamond configuration, such that 2 different subsets (of 3) are symmetric, and 11 of 15 possible regions are represented (missing 2 4C2's and 2 4C3's).", },
    { name: "Circles (fixed)", val: CirclesFixed, description: "4 circles, initialized in a diamond as in \"Circles (flexible)\" above, but these are fixed as circles (rx and ry remain constant, rotation is immaterial)", },
    { name: "Disjoint", val: Disjoint, description: "4 disjoint circles. When two (or more) sets are supposed to intersect, but don't, a synthetic penalty is added to the error computation, which is proportional to: 1) each involved set's distance to the centroid of the centers of the sets that are supposed to intersect, as well as 2) the size of the target subset. This \"disjoint\" initial layout serves demonstrate/test this behavior. More sophisticated heuristics would be useful here, as the current scheme is generally insufficient to coerce all sets into intersecting as they should." },
    { name: "Nested", val: Nested, description: "4 nested circles, stresses disjoint/contained region handling, which has known issues!" },
    // { name: "CircleLattice", layout: SymmetricCircleLattice, description: "4 circles centered at (0,0), (0,1), (1,0), (1,1)", },
]

export type Params = {
    s: Param<ShapesParam | null>
    t: Param<Targets | null>
    n: Param<SetMetadata | null>
}

export type ParsedParams = {
    s: ParsedParam<ShapesParam | null>
    t: ParsedParam<Targets | null>
    n: ParsedParam<SetMetadata | null>
}

export type HashMap = {
    s: HashMapVal<ShapesParam>
    t: HashMapVal<Targets>
    n: HashMapVal<SetMetadata>
}

export type HistoryState = {
    s: ShapesParam
    t: Targets
    n: SetMetadata
}

function usePreviousValue<T>(value: T) {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export const MaxNumShapes = 5

const fizzBuzzLink = <A href={"https://en.wikipedia.org/wiki/Fizz_buzz"}>Fizz Buzz</A>

export function Body() {
    const { toggleTheme, diagramBg } = useTheme()

    const [ logLevel, setLogLevel ] = useSessionStorageState<LogLevel>("logLevel", { defaultValue: "info" })
    useEffect(
        () => {
            update_log_level(logLevel)
        },
        [ logLevel, ]
    );

    const [ initialLayout, setInitialLayout] = useSessionStorageState<InitialLayout>(initialLayoutKey, { defaultValue: Ellipses4t })

    const [ urlShapesPrecisionScheme, setUrlShapesPrecisionScheme ] = useSessionStorageState<number>("urlShapesPrecisionScheme", { defaultValue: 6 })

    const params: Params = {
        s: shapesParam({ precisionSchemeId: 1 }),
        t: targetsParam,
        n: setMetadataParam,
    }

    const [ stateInUrlFragment, setStateInUrlFragment ] = useSessionStorageState<boolean>("shapesInUrlFragment", { defaultValue: true })

    const {
        s: [ urlFragmentShapes, setUrlFragmentShapes ],
        t: [ urlFragmentTargets, setUrlFragmentTargets ],
        n: [ urlSetMetadata, setUrlSetMetadata ],
    }: ParsedParams = parseHashParams({ params })

    const [ initialShapes, setInitialShapes ] = useState<Shapes>(() => {
        // console.log("initialShapes: hash", window.location.hash)
        if (urlFragmentShapes) {
            console.log("found urlFragmentShapes:", urlFragmentShapes)
            setUrlFragmentShapes(null)
            setUrlShapesPrecisionScheme(urlFragmentShapes.precisionSchemeId)
            return urlFragmentShapes.shapes
        } else {
            console.log("no urlFragmentShapes found")
        }
        const str = sessionStorage.getItem(shapesKey)
        return str
            ? JSON.parse(str)
            : initialLayout.map(s => toShape(s))
    })

    const [ rawTargets, setTargets ] = useState<Targets>(() => {
        if (urlFragmentTargets) {
            console.log("found urlFragmentTargets:", urlFragmentTargets)
            setUrlFragmentTargets(null)
            return urlFragmentTargets
        }
        const str = sessionStorage.getItem(targetsKey)
        return makeTargets(
            str
                ? JSON.parse(str)
                : FizzBuzzBazz
        )
    })

    const [ setMetadata, setSetMetadata ] = useState<SetMetadata>(() => {
        if (urlSetMetadata) {
            console.log("found urlSetMetadata:", urlSetMetadata)
            setUrlSetMetadata(null)
            return urlSetMetadata
        }
        const str = sessionStorage.getItem(setMetadataKey)
        return str
            ? JSON.parse(str)
            : DefaultSetMetadata
    })
    // Layer of indirection around `rawTargets`, to ensure `initialSets` and `targets` are updated atomically.
    // Otherwise, changing targets / numbers of shapes can result in intermediate renders with inconsistent sizes of
    // shape- and target-arrays.
    const { targets, initialSets  } = useMemo(
        () => {
            const targets = rawTargets
            const { numShapes } = targets
            const initialSets: S[] =
                initialShapes
                    .slice(0, numShapes)
                    .map((s, idx) => {
                        const shape = toShape(s)
                        let setMetadatum = setMetadata[idx] || DefaultSetMetadata[idx]
                        return {
                            idx,
                            ...setMetadatum,
                            shape: shape,
                        }
                    })

            console.log("updated targets block:", numShapes, targets, initialSets, "layout:", initialLayout.length, "hash:", window.location.hash)
            return { targets, initialSets, }
        },
        [ rawTargets.all, rawTargets.numShapes, initialShapes, setMetadata ]
    )

    const gridState = GridState({
        storage: 'session',
        center: { x: 0, y: sq3/4, },
        scale: 100,
        width: 800,
        height: 400,
        // showGrid: true,
    })
    const {
        scale: [ scale, setScale ],
        center: [ gridCenter, setGridCenter ],
        width: [ gridWidth ],
        height: [ gridHeight ],
        showGrid: [ showGrid, setShowGrid ],
    } = gridState

    const [ settingsShown, setSettingsShown ] = useSessionStorageState("settingsShown", { defaultValue: false, })
    const [ targetsShown, setTargetsShown ] = useSessionStorageState("targetsShown", { defaultValue: false, })
    const [ examplesShown, setExamplesShown ] = useSessionStorageState("examplesShown", { defaultValue: false, })
    const [ errorPlotShown, setErrorPlotShown ] = useSessionStorageState("errorPlotShown", { defaultValue: false, })
    const [ varsShown, setVarsShown ] = useSessionStorageState("varsShown", { defaultValue: false, })
    const [ shapesShown, setShapesShown ] = useSessionStorageState("shapesShown", { defaultValue: false, })
    const [ layoutsShown, setLayoutsShown ] = useSessionStorageState("layoutsShown", { defaultValue: false, })

    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useSessionStorageState("maxErrorRatioStepSize", { defaultValue: 0.5 })
    const [ maxSteps, setMaxSteps ] = useSessionStorageState("maxSteps", { defaultValue: 10000 })
    const [ stepBatchSize, setStepBatchSize ] = useSessionStorageState("stepBatchSize", { defaultValue: 20 })
    const [ showRegionSizes, setShowRegionSizes ] = useSessionStorageState("showRegionSizes", { defaultValue: false })

    const [ model, setModel ] = useState<Model | null>(null)
    const [ modelStepIdx, setModelStepIdx ] = useState<number | null>(null)
    const [ vStepIdx, setVStepIdx ] = useState<number | null>(null)
    const [ runningState, setRunningState ] = useState<RunningState>("none")
    const [ frameLen, setFrameLen ] = useState(0)
    const [ autoCenter, setAutoCenter ] = useSessionStorageState("autoCenter", { defaultValue: true })
    const [ setLabelDistance, setSetLabelDistance ] = useState(0.15)
    const [ setLabelSize, setSetLabelSize ] = useState(20)

    const [ stepIdx, setStepIdx ] = useMemo(
        () => {
            return [
                vStepIdx !== null ? vStepIdx : modelStepIdx,
                (stepIdx: number) => {
                    setModelStepIdx(stepIdx)
                    setVStepIdx(null)
                },
            ]
        },
        [ modelStepIdx, setModelStepIdx, vStepIdx, setVStepIdx, ]
    )

    const historyLog = false
    const pushHistoryState = useCallback(
        debounce(
            ({ shapes, newTargets, newSetMetadata, push }: { shapes: Shapes, newTargets?: Targets, newSetMetadata?: SetMetadata, push?: boolean }) => {
                console.log("debounced pushHistoryState:", shapes, newTargets, newSetMetadata, push)
                if (stateInUrlFragment) {
                    const param = { shapes, precisionSchemeId: urlShapesPrecisionScheme }
                    const newHashMap = { s: param, t: newTargets || targets, n: newSetMetadata || setMetadata, }
                    if (historyLog) console.log(`history push (${push ? "push" : "replace"}, ${targets.numShapes}, ${newHashMap.s.shapes.length}`, newHashMap)
                    updateHashParams(params, newHashMap, { push, log: historyLog })
                }
            },
            400,
            // { leading: true, trailing: false, }
        ),
        [ stateInUrlFragment, targets, setMetadata, urlShapesPrecisionScheme, ]
    )

    const [ curStep, sets, shapes, ] = useMemo(
        () => {
            if (!model || stepIdx === null) return [ null, null ]
            // console.log("recomputing curStep")
            if (stepIdx >= model.steps.length) {
                console.warn("stepIdx >= model.steps.length", stepIdx, model.steps.length)
                return [ null, null ]
            }
            const curStep = model.steps[stepIdx]
            // Save current shapes to sessionStorage
            const shapes = curStep.sets.map(({ shape }) => shape)
            sessionStorage.setItem(shapesKey, JSON.stringify(shapes))
            const sets = curStep.sets.map(set => ({ ...initialSets[set.idx], ...set, }))

            if (stateInUrlFragment) {
                if (targets.numShapes == shapes.length) {
                    pushHistoryState({ shapes, newTargets: targets })
                } else {
                    console.warn("skipping updateUrl push: targets.numShapes != shapes.length", targets.numShapes, shapes.length)
                }
            }
            return [ curStep, sets, shapes ]
        },
        [ model, stepIdx, initialSets, targets, stateInUrlFragment, pushHistoryState, ]
    )

    // Save targets to sessionStorage
    useEffect(
        () => {
            const { givenInclusive, inclusive, exclusive } = rawTargets
            sessionStorage.setItem(targetsKey, JSON.stringify(givenInclusive ? inclusive : exclusive))
        },
        [ rawTargets, ]
    )

    useEffect(
        () => {
            console.log("Writing setMetadata to sessionStorage:", setMetadata)
            sessionStorage.setItem(setMetadataKey, JSON.stringify(setMetadata))
        },
        [ setMetadata ]
    )

    // Save latest `model` to `window`, for debugging
    useEffect(
        () => {
            if (typeof window !== 'undefined') {
                window.model = model
                window.curStep = curStep
            }
        },
        [ model, curStep ]
    )

    const getHistoryState = useCallback(
        (hash: string) => mapEntries(getHashMap<Params, HashMap>(params, hash), (k, { val }) => [ k, val ]) as HistoryState,
        [ params ]
    )

    useEffect(
        () => {
            const popStateFn = (e: PopStateEvent) => {
                const hash = getHistoryStateHash()
                console.log("popstate: hash", hash, "e.state", e.state, "history.state", history.state)
                if (!hash) {
                    console.warn(`no hash in history state url ${history.state.url} or as ${history.state.as}`)
                    return
                }
                const { s, t, n } = getHistoryState(hash)
                if (s) {
                    console.log("setting shapes from history state:", s)
                    setInitialShapes(s.shapes)
                    setUrlShapesPrecisionScheme(s.precisionSchemeId)
                } else {
                    console.warn("no shapes in history state")
                }
                if (t) {
                    console.log("setting targets from history state:", t)
                    setTargets(t)
                } else {
                    console.warn("no targets in history state")
                }
                if (n) {
                    console.log("setting setMetadata from history state:", n)
                    setSetMetadata(n)
                } else {
                    console.warn("no setMetadata in history state")
                }
            }
            const hashChangeFn = (e: HashChangeEvent) => {
                console.log("hashchange: oldURL", e.oldURL, "newURL", e.newURL, e)
            }
            window.addEventListener('popstate', popStateFn)
            window.addEventListener('hashchange', hashChangeFn)
            return () => {
                window.removeEventListener('popstate', popStateFn)
                window.removeEventListener('hashchange', hashChangeFn)
            }
        },
        [ setInitialShapes, setUrlShapesPrecisionScheme, setTargets, ]
    )

    const [ vars, setVars ] = useState<Vars | null>(null)

    // Initialize model, stepIdx
    useEffect(
        () => {
            // console.log("make model effect")
            // Naively, n circles have 3n degrees of freedom. However, WLOG, we can fix:
            // - c0 to be a unit circle at origin (x = y = 0, r = 1)
            // - c1.y = 0 (only x and r can move)
            // resulting in 4 fewer free variables.
            let curIdx = 0
            const vars = makeVars(initialSets)
            const { numVars, skipVars } = vars
            const inputs = initialSets.map((set: S, shapeIdx: number) => {
                const shape = set.shape;
                const coords: Coord[] = mapShape<number, Coord[]>(shape, () => CircleCoords, () => XYRRCoords, () => XYRRTCoords)
                return [
                    mapShape<number, any>(
                        shape,
                        s => ({ Circle: s }),
                        s => ({ XYRR: s }),
                        s => ({ XYRRT: s })
                    ),
                    coords.map(v => shapeIdx >= skipVars.length || !skipVars[shapeIdx].includes(v)),
                ]
            })
            console.log("inputs:", inputs)
            console.log("targets:", targets)
            const tgtList: Target[] = Array.from(targets.all)
            if (inputs.length != tgtList[0][0].length) {
                console.warn("inputs.length != tgtList[0][0].length", inputs.length, tgtList[0][0].length)
                return
            }
            const model = makeModel(apvd.make_model(inputs, tgtList), initialSets)
            console.log("new model:", model)
            setModel(model)
            setStepIdx(0)
            setVars(vars)
        },
        [ initialSets, targets.all, ]
    )

    const fwdStep = useCallback(
        (n?: number) => {
            if (!model || stepIdx === null) return
            if (stepIdx >= maxSteps) {
                console.log("maxSteps reached, not running step")
                setRunningState("none")
                return
            }
            let batchSize
            if (n === undefined) {
                n = stepIdx + 1 == model.steps.length ? stepBatchSize : 1
                batchSize = stepBatchSize
            } else {
                batchSize = stepIdx + n + 1 - model.steps.length
            }
            if (stepIdx + n < model.steps.length) {
                // "Fast-forward" without any new computation
                setStepIdx(stepIdx + n)
                console.log("fwdStep: bumping stepIdx to", stepIdx + n)
                return
            }
            if (model.repeat_idx) {
                // Don't advance past repeat_idx
                setStepIdx(model.steps.length - 1)
                console.log(`fwdStep: bumping stepIdx to ${model.steps.length - 1} due to repeat_idx ${model.repeat_idx}`)
                return
            }
            if (stepIdx + n > maxSteps) {
                n = maxSteps - stepIdx
                batchSize = n
                console.log(`fwdStep: clamping advance to ${n} steps due to maxSteps ${maxSteps}`)
            }

            const lastStep: apvd.Step = model.raw.steps[model.raw.steps.length - 1]
            const batchSeed: apvd.Model = {
                steps: [ lastStep ],
                repeat_idx: null,
                min_idx: 0,
                min_error: lastStep.error.v,
            }
            const batch: Model = makeModel(train(batchSeed, maxErrorRatioStepSize, batchSize), initialSets)
            const batchMinStep = batch.steps[batch.min_idx]
            const modelMinStep = model.raw.steps[model.min_idx]
            const steps = model.steps.concat(batch.steps.slice(1))
            const [ min_idx, min_error ] = (batchMinStep.error.v < modelMinStep.error.v) ?
                [ batch.min_idx + model.raw.steps.length - 1, batchMinStep.error.v ] :
                [ model.min_idx, model.raw.min_error ]
            const repeat_idx = batch.repeat_idx !== null ? batch.repeat_idx + model.raw.steps.length - 1 : null
            const newRawModel: apvd.Model = {
                steps: model.raw.steps.concat(batch.raw.steps.slice(1)),
                repeat_idx,
                min_idx,
                min_error,
            }
            const newModel: Model = {
                steps,
                repeat_idx,
                min_idx,
                min_error,
                lastStep: batch.lastStep,
                raw: newRawModel,
            }
            // console.log("newModel:", newModel)
            setModel(newModel)
            setStepIdx(newModel.steps.length - 1)
        },
        [ model, stepIdx, stepBatchSize, maxErrorRatioStepSize, maxSteps, initialSets, ]
    )

    const revStep = useCallback(
        (n?: number) => {
            if (stepIdx === null) return
            const newStepIdx = max(0, stepIdx - (n || 1))
            if (stepIdx > newStepIdx) {
                console.log("reversing stepIdx to", newStepIdx)
                setStepIdx(newStepIdx)
            }
        },
        [ stepIdx, ],
    )

    const cantAdvance = useMemo(
        () => (model && model.repeat_idx && stepIdx == model.steps.length - 1) || stepIdx == maxSteps,
        [ model, stepIdx, maxSteps ],
    )

    const cantReverse = useMemo(() => stepIdx === 0, [ stepIdx ])

    // Keyboard shortcuts via use-kbd
    useAction('playback:step-forward', {
        label: 'Step forward',
        group: 'playback',
        defaultBindings: ['right'],
        handler: () => {
            if (cantAdvance) return
            fwdStep()
            setRunningState("none")
        },
    })

    useAction('playback:step-forward-10', {
        label: 'Step forward 10',
        group: 'playback',
        defaultBindings: ['shift+right'],
        handler: () => {
            if (cantAdvance) return
            fwdStep(10)
            setRunningState("none")
        },
    })

    useAction('playback:go-to-end', {
        label: 'Go to end',
        group: 'playback',
        defaultBindings: ['meta+right'],
        handler: () => {
            if (cantAdvance || !model) return
            setStepIdx(model.steps.length - 1)
            setRunningState("none")
        },
    })

    useAction('playback:step-backward', {
        label: 'Step backward',
        group: 'playback',
        defaultBindings: ['left'],
        handler: () => {
            if (cantReverse) return
            revStep(1)
            setRunningState("none")
        },
    })

    useAction('playback:step-backward-10', {
        label: 'Step backward 10',
        group: 'playback',
        defaultBindings: ['shift+left'],
        handler: () => {
            if (cantReverse) return
            revStep(10)
            setRunningState("none")
        },
    })

    useAction('playback:go-to-start', {
        label: 'Go to start',
        group: 'playback',
        defaultBindings: ['meta+left'],
        handler: () => {
            if (cantReverse) return
            setStepIdx(0)
            setRunningState("none")
        },
    })

    useAction('playback:play-pause', {
        label: 'Play/pause',
        group: 'playback',
        defaultBindings: ['space'],
        handler: () => {
            if (cantAdvance) return
            setRunningState(runningState == "fwd" ? "none" : "fwd")
        },
    })

    useAction('playback:play-pause-reverse', {
        label: 'Play/pause (reverse)',
        group: 'playback',
        defaultBindings: ['shift+space'],
        handler: () => {
            if (cantReverse) return
            setRunningState(runningState == "rev" ? "none" : "rev")
        },
    })

    useAction('nav:toggle-theme', {
        label: 'Toggle dark/light mode',
        group: 'nav',
        defaultBindings: ['t'],
        handler: toggleTheme,
    })

    // Run steps
    useEffect(
        () => {
            if (runningState == 'none') return
            if (!model || stepIdx === null) return
            let step: () => void
            const expectedDirection = runningState
            if (runningState == 'fwd') {
                if (model.repeat_idx && stepIdx + 1 == model.steps.length) {
                    console.log(`effect: found repeat_idx ${model.repeat_idx}, not running steps`)
                    setRunningState("none")
                    return
                }
                step = fwdStep
            } else {
                if (stepIdx === 0) {
                    console.log(`effect: at step 0, not running steps`)
                    setRunningState("none")
                    return
                }
                step = revStep
            }

            // console.log(`scheduling ${runningState} step ${stepIdx}`)
            const timer = setTimeout(
                () => {
                    if (runningState == expectedDirection) {
                        // console.log(`running ${expectedDirection} step from ${stepIdx}`)
                        step()
                    } else {
                        console.log(`skipping ${expectedDirection} from step ${stepIdx}, runningSteps is ${runningState}`)
                    }
                },
                frameLen,
            );
            return () => clearTimeout(timer)
        },
        [ runningState, model, stepIdx, fwdStep, revStep, frameLen, ],
    )

    const error = useMemo(() => curStep?.error, [ curStep ])
    const bestStep = useMemo(
        () => {
            if (!model) return null
            return model.steps[model.min_idx]
        },
        [ model ],
    )
    const repeatSteps = useMemo(
        () => {
            if (!model || !model.repeat_idx || stepIdx === null) return null
            return [ model.repeat_idx, model.steps.length - 1 ]
        },
        [ model, stepIdx ],
    )

    const [ plotInitialized, setPlotInitialized ] = useState(false)
    const plot = useMemo(
        () => {
            if (!model || stepIdx === null) return
            const steps = model.steps
            return <>
                <Suspense fallback={<div className={css.plot}>Loading plot...</div>}>
                    <Plot
                        className={css.plot}
                        style={plotInitialized ? {} : { display: "none", }}
                        data={[{
                            // x: steps.map((_: Step, idx: number) => xlo + idx),
                            y: steps.map(step => step.error.v),
                            type: 'scatter',
                            mode: 'lines',
                            marker: { color: 'red' },
                        }]}
                        layout={{
                            dragmode: 'pan',
                            hovermode: 'x',
                            margin: { t: 0, l: 40, r: 0, b: 40, },
                            xaxis: {
                                title: { text: 'Step' },
                                rangemode: 'tozero',
                            },
                            yaxis: {
                                title: { text: 'Error' },
                                type: 'log',
                                fixedrange: true,
                                rangemode: 'tozero',
                            },
                            shapes: [{
                                type: 'line',
                                x0: stepIdx,
                                x1: stepIdx,
                                xref: 'x',
                                y0: 0,
                                y1: 1,
                                yref: 'paper',
                                fillcolor: 'grey',
                            }]
                        }}
                        config={{ displayModeBar: false, responsive: true, }}
                        onInitialized={() => {
                            console.log("plot initialized")
                            setPlotInitialized(true)
                        }}
                        onRelayout={(e: any) => {
                            console.log("relayout:", e)
                        }}
                        onHover={(e: any) => {
                            const vStepIdx = round(e.xvals[0])
                            setVStepIdx(vStepIdx)
                        }}
                    />
                </Suspense>
                {!plotInitialized &&
                    <div className={css.plot}>
                        Loading plot...
                    </div>
                }
            </>
        },
        [ model, stepIdx, plotInitialized, ],
    )

    const [ showSparkLines, setShowSparkLines ] = useSessionStorageState("showSparkLines", { defaultValue: true })
    const [ sparkLineLimit, setSparkLineLimit ] = useSessionStorageState("sparkLineLimit", { defaultValue: 40 })
    const [ sparkLineStrokeWidth, setSparkLineStrokeWidth ] = useState(1)
    const [ sparkLineMargin, setSparkLineMargin ] = useState(1)
    const [ sparkLineWidth, setSparkLineWidth ] = useState(80)
    const [ sparkLineHeight, setSparkLineHeight ] = useState(30)
    const sparkLineProps: SparkLineProps = { showSparkLines, sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, }
    const sparkLineCellProps = model && (typeof stepIdx === 'number') && { model, stepIdx, ...sparkLineProps }

    const col5 = "col"
    const col7 = "col"
    const col6 = "col"
    const col12 = "col-12"

    const PlaybackControl = useCallback(
        ({ title, hotkey, onClick, disabled, animating, children }: {
            title: string
            hotkey: string
            onClick: () => void
            disabled: boolean
            animating?: boolean
            children?: ReactNode
        }) => {
            title = `${title} (${hotkey})`
            return <OverlayTrigger overlay={<Tooltip>{title}</Tooltip>}>
                <span className={css.playbackControlButtonContainer}>
                    <Button
                        className={css.playbackControlButton}
                        title={title}
                        onTouchEnd={e => {
                            // console.log("onTouchEnd")
                            onClick()
                            if (!animating) {
                                setRunningState("none")
                            }
                            e.stopPropagation()
                            e.preventDefault()
                        }}
                        onClick={e => {
                            // console.log("onClick")
                            onClick()
                            if (!animating) {
                                setRunningState("none")
                            }
                            e.stopPropagation()
                        }}
                        disabled={disabled}>
                        {children}
                    </Button>
                </span>
            </OverlayTrigger>
        },
        [ setRunningState ],
    )

    const fs = [ 0.25, 0.5, 0.75, ];
    // const fs = [ 0.5, ];

    const shapeNodes = useMemo(
        () => <g id={"shapes"}>{
            sets?.map(({ color, shape }: S, idx: number) => {
                const { x: cx, y: cy } = shape.c
                const props = {
                    cx, cy,
                    stroke: "black",
                    strokeWidth: 3 / scale,
                    fill: color,
                    fillOpacity: 0.3,
                }
                const [ rx, ry ] = getRadii(shape)
                const theta = shape.kind === 'XYRRT' ? shape.t : 0
                const degrees = theta * 180 / PI
                const ellipse =
                    <ellipse
                        key={idx}
                        rx={rx}
                        ry={ry} {...props}
                        // onMouseDown={e => {
                        //     console.log(`ellipse ${idx} onMouseDown`, e)
                        //     e.stopPropagation()
                        // }}
                    />
                return degrees ? <g key={idx} transform={`rotate(${degrees} ${cx} ${cy})`}>{ellipse}</g> : ellipse
            })
        }</g>,
        [ sets, scale ],
    )

    const [ showIntersectionPoints, setShowIntersectionPoints ] = useSessionStorageState("showIntersectionPoints", { defaultValue: false })
    const intersectionNodes = useMemo(
        () => showIntersectionPoints && <g id={"intersections"}>{
            curStep && ([] as ReactNode[]).concat(...curStep.components.map((component, componentIdx) => component.points.map(({ x, y, }, pointIdx) => {
                return (
                    <OverlayTrigger
                        key={`${componentIdx}-${pointIdx}`}
                        overlay={
                            <Tooltip>
                                <div>x: {x.toPrecision(4)}</div>
                                <div>y: {y.toPrecision(4)}</div>
                            </Tooltip>
                        }>
                        <circle
                            cx={x}
                            cy={y}
                            r={0.05}
                            stroke={"black"}
                            strokeWidth={1 / scale}
                            fill={"black"}
                            fillOpacity={0.8}
                        />
                    </OverlayTrigger>
                )
            })))
        }</g>,
        [ showIntersectionPoints, curStep, scale, ],
    )

    const [ showEdgePoints, setShowEdgePoints ] = useState(false)
    const edgePoints = useMemo(
        () =>
            showEdgePoints && curStep && ([] as ReactNode[]).concat(...curStep.components.map((component, componentIdx) => component.edges.map((edge, edgeIdx) =>
                fs.map(f => {
                    const midpoint = getMidpoint(edge, f)
                    // console.log(`edge: ${set.idx}, ${round(deg(edge.theta0))}, ${round(deg(edge.theta1))}, midpoint: ${midpoint}`)
                    return <circle
                        key={`${componentIdx}-${edgeIdx} ${f}`}
                        cx={midpoint.x}
                        cy={midpoint.y}
                        r={0.1}
                        stroke={"red"}
                        strokeWidth={1 / scale}
                        fill={"red"}
                        fillOpacity={0.5}
                    />
                })
            ))),
        [ showEdgePoints, curStep, scale, ]
    )

    const [ hoveredRegion, setHoveredRegion ] = useState<string | null>(null)

    const totalRegionAreas = useMemo(
        () => {
            if (!curStep) return
            let regionAreas: { [k: string]: number } = {}
            curStep.components.forEach(component => component.regions.forEach(({ key, area }) => {
                if (!(key in regionAreas)) {
                    regionAreas[key] = 0
                }
                regionAreas[key] += area
            }))
            return regionAreas
        },
        [ curStep ]
    )

    const largestRegions = useMemo(
        () => {
            const largestRegions: { [key: string]: Region } = {}
            curStep && sets && curStep.regions.forEach(region => {
                const { key, area } = region;
                if (!(key in largestRegions) || largestRegions[key].area < area) {
                    largestRegions[key] = region
                }
            })
            return largestRegions
        },
        [ curStep ]
    )

    const exteriorRegions = useMemo(
        () => {
            const exteriorRegions: { [name: string]: { setIdx: number, region: Region } } = {}
            curStep && sets && values(largestRegions).forEach(region => {
                const { key } = region;
                const idxChars = key.replaceAll('-', '').split('')
                if (idxChars.length == 1) {
                    const [ idxChar ] = idxChars
                    const setIdx = parseInt(idxChar)
                    const name = sets[setIdx].name
                    if (name in exteriorRegions) {
                        console.error(`Multiple largestRegions for ${name}:`, region, largestRegions)
                    } else {
                        exteriorRegions[name] = { setIdx, region }
                    }
                }
            })
            return exteriorRegions
        },
        [ curStep, sets, ]
    )
    const setLabelPoints = useMemo(
        () => {
            if (!exteriorRegions) return
            const setLabelPoints: { [name: string]: LabelPoint } = {}
            entries(exteriorRegions)
                .forEach(([ name, { setIdx, region: { segments, } } ]) => {
                    const boundarySegments = segments.filter(({edge}) => edge.isComponentBoundary && edge.set.idx == setIdx)
                    if (boundarySegments.length == 0) {
                        console.log(`skipping region ${name} with no boundary segments`)
                        return
                    }
                    const edge= boundarySegments.map(({ edge }) => edge).reduce((cur, nxt) =>
                        (nxt.theta1 - nxt.theta0 > cur.theta1 - cur.theta0) ? nxt : cur
                    )
                    const {theta0, theta1,} = edge
                    const theta = (theta0 + theta1) / 2
                    const [ point, direction] = getPointAndDirectionAtTheta(edge.set.shape, theta)
                    const normal = direction - pi2
                    const { textAnchor, dominantBaseline } = getLabelAttrs(normal)
                    // console.log(`set ${name}: normal ${degStr(normal)}`, textAnchor, dominantBaseline)
                    const r = setLabelDistance
                    const x = point.x + r * cos(normal)
                    const y = point.y + r * sin(normal)
                    // console.log(name, edge, point, degStr(direction), degStr(normal))
                    setLabelPoints[name] = { setIdx, x, y, point, textAnchor, dominantBaseline, }
                })
            // console.log("new setLabelPoints:", setLabelPoints)
            return setLabelPoints
        },
        [ exteriorRegions, setLabelDistance, ]
    )
    const allSetLabelStates = new Array(MaxNumShapes).fill(0).map(() => useState<SVGTextElement | null>(null))
    const allSetLabelRefs = allSetLabelStates.map(([ ref ]) => ref)
    const setLabels = useMemo(
        () => setLabelPoints && <g id={"setLabels"}>{
            entries(setLabelPoints).map(([ label, { setIdx, x, y, point, textAnchor, dominantBaseline } ]) => {
                return (<Fragment key={label}>
                    {/*<circle cx={point.x} cy={point.y} r={0.05} stroke={"black"} strokeWidth={1 / scale} fill={"black"} fillOpacity={0.5} />*/}
                    {/*<circle cx={x} cy={y} r={0.05} stroke={"red"} strokeWidth={1 / scale} fill={"red"} fillOpacity={0.5} />*/}
                    <text
                        // key={label}
                        ref={e => {
                            // console.log(`New textnode ref #${setIdx}:`, e)
                            allSetLabelStates[setIdx][1](e)
                        }}
                        transform={`translate(${x}, ${y}) scale(1, -1)`}
                        textAnchor={textAnchor}
                        dominantBaseline={dominantBaseline}
                        className={css.setLabel}
                        fontSize={setLabelSize / scale}
                    >{label}</text>
                </Fragment>)
            })
        }</g>,
        [ setLabelPoints, setLabelDistance, ]
    )
    const labelBoxes = useMemo(
        () => {
            if (!curStep || !setLabelPoints) return
            const setLabelRefs = allSetLabelRefs.slice(0, curStep.targets.n)
            // console.log(`Including ${setLabelRefs.length} text ref bounding boxes:`, setLabelRefs)
            // console.log("setLabelPoints:", setLabelPoints)
            const labelBoxes = setLabelRefs.map((textNode, idx) => {
                const setLabelPoint = values(setLabelPoints).find(({ setIdx }) => setIdx == idx)
                if (!setLabelPoint) {
                    console.warn(`No setLabelPoint found for setIdx ${idx}`)
                    return null
                }
                const point = { x: setLabelPoint.x, y: setLabelPoint.y }
                // console.log(`textNode ${idx}:`, textNode)
                if (!textNode) return null
                const textBox = textNode.getBBox()
                const { x, y, width, height } = textBox
                let lo = { x: point.x + x, y: point.y + y, }
                let hi = { x: lo.x + width, y: lo.y + height }
                return [ lo, hi ]
                // const box = [ lo, hi, ]
                // console.log(`box${idx}:`, ...box)
                // return box
            })
            // console.log("recomputed labelBoxes:", ...([] as BoundingBox<number>[]).concat(...labelBoxes))
            return labelBoxes
        },
        [ curStep, setLabelPoints, useDeepCmp(allSetLabelRefs.map(r => !!r)), ]
    )
    const boundingBox = useMemo(
        () => {
            if (!curStep) return
            const shapesBox =
                shapes
                    .map(s => shapeBox(s))
                    .reduce(
                        (cur, box) => [
                            {
                                x: min(cur[0].x, box[0].x),
                                y: min(cur[0].y, box[0].y),
                            }, {
                                x: max(cur[1].x, box[1].x),
                                y: max(cur[1].y, box[1].y),
                            }
                        ]
                    )
            // console.log("recomputing boundingBox:", ...shapesBox)
            if (!labelBoxes) return shapesBox
            const expandedBox = labelBoxes.reduce<BoundingBox<number>>(
                (curBox, textBox, idx) => {
                    if (!textBox) return curBox
                    // console.log(`textBox${idx}:`, ...textBox)
                    return [
                        { x: min(curBox[0].x, textBox[0].x), y: min(curBox[0].y, textBox[0].y), },
                        { x: max(curBox[1].x, textBox[1].x), y: max(curBox[1].y, textBox[1].y), },
                    ]
                },
                shapesBox
            )
            // console.log("expandedBox:", ...expandedBox)
            return expandedBox
        },
        [ curStep, shapes, useDeepCmp(labelBoxes), ]
    )

    const panZoom = useCallback(
        () => {
            if (!boundingBox) return
            const [ lo, hi ] = boundingBox
            const sceneCenter = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, }
            const width = hi.x - lo.x
            const height = hi.y - lo.y
            const sceneScale = min(gridWidth / width, gridHeight / height) * 0.9
            const newCenter = {
                x: sceneCenter.x,
                y: sceneCenter.y,
            }
            const newScale = sceneScale
            if (newScale !== scale) {
                // console.log("updating gridScale:", scale, newScale)
                setScale(newScale)
            }
            if (!_.isEqual(newCenter, gridCenter)) {
                // console.log("updating gridCenter:", gridCenter, newCenter)
                setGridCenter(newCenter)
            }
        },
        [ boundingBox, gridWidth, gridHeight, gridCenter, scale ]
    )

    // Pan/Zoom to fit scene bounding-box
    useEffect(
        () => {
            if (!autoCenter) return
            if (runningState == 'none') return
            panZoom()
        },
        [ curStep, stepIdx, runningState, autoCenter, panZoom ]
    )

    const prevBoundingBox = usePreviousValue(boundingBox)
    useEffect(
        () => {
            if (stepIdx == 0 && !_.isEqual(prevBoundingBox, boundingBox)) {
                console.log("stepIdx == 0 + new bounding box: panZoom(); prev:", ...(prevBoundingBox ? prevBoundingBox : [null]), "new:", ...(boundingBox ? boundingBox : [null]))
                panZoom()
            }
        },
        [ boundingBox, prevBoundingBox, stepIdx, panZoom ]
    )

    // panZoom "warp" on vStepIdx changes (e.g. mouseover history slider or error plot)
    useEffect(
        () => {
            // "Warp" to current scene bounding-box in response to a "virtual" stepIdx change (e.g. mousing over history
            // slider or error plot)
            if (!autoCenter) return
            // console.log("setDopanZoom(): vStepIdx warp", vStepIdx)
            panZoom()
        },
        [ vStepIdx, autoCenter ]
    )
    const regionTooltips = useMemo(
        () =>
            curStep && sets && <g id={"regionLabels"}>{
                values(largestRegions).map((region, regionIdx) => {
                    const { key, containers } = region
                    const center = getRegionCenter(region, fs)
                    const containerIdxs = containers.map(set => set.idx)
                    containerIdxs.sort()
                    const label = `{ ${containerIdxs.map(idx => sets[idx].name).join(', ')} }`
                    const gridArea = totalRegionAreas && totalRegionAreas[key] || 0
                    const area = gridArea / curStep.total_area.v * curStep.targets.total_area
                    const areaLabel = fmt(area)
                    const target = targets.all.get(key) || 0
                    // console.log("key:", key, "hoveredRegion:", hoveredRegion)
                    return (
                        <OverlayTrigger
                            key={`${regionIdx}-${key}`}
                            show={key == hoveredRegion}
                            overlay={<Tooltip className={css.regionTooltip} onMouseOver={() => setHoveredRegion(key)}>
                                <p className={css.regionTooltipLabel}>{label}</p>
                                {fmt(target)} → {areaLabel}
                            </Tooltip>}>
                            <text
                                transform={`translate(${center.x}, ${center.y}) scale(1, -1)`}
                                textAnchor={"middle"}
                                dominantBaseline={"middle"}
                                fontSize={16 / scale}
                                // Need non-empty text content in order for tooltips to appear correctly positioned in
                                // Firefox (otherwise they end up off the screen somewhere).
                                // TODO: file issue: https://github.com/react-bootstrap/react-bootstrap/issues
                                opacity={showRegionSizes ? 1 : 0}
                            >{areaLabel}</text>
                        </OverlayTrigger>
                    )
                })
            }</g>,
        [ curStep, scale, hoveredRegion, totalRegionAreas, showRegionSizes ],
    )

    const regionPaths = useMemo(
        () =>
            curStep && <g id={"regionPaths"}>{
                curStep.regions.map((region, regionIdx) => {
                    const { key} = region
                    const d = regionPath(region)
                    const isHovered = hoveredRegion == key
                    return (
                        <path
                            key={`${regionIdx}-${key}`}
                            id={key}
                            d={d}
                            stroke={"black"}
                            strokeWidth={1 / scale}
                            fill={"grey"}
                            fillOpacity={isHovered ? 0.4 : 0}
                            fillRule={"evenodd"}
                            onMouseOver={() => setHoveredRegion(key)}
                            // onMouseLeave={() => setHoveredRegion(null)}
                            onMouseOut={() => setHoveredRegion(null)}
                        />
                    )
                })
            }</g>,
        [ curStep, scale, hoveredRegion, ],
    )

    const shapesStr = useCallback(
        (fn: (shape: Shape<number>) => string) => {
            if (!shapes) return
            const shapeStrs = shapes.map(shape => fn(shape))
            return `[\n  ${shapeStrs.join(",\n  ")},\n]`
        },
        [ shapes ]
    )

    const urlStr = useCallback(
        () => {
            if (!shapes || !targets) return undefined
            const hash = updatedHash(
                params, {
                    s: { shapes, precisionSchemeId: urlShapesPrecisionScheme },
                    t: targets,
                }
            )
            return `${window.location.origin}${window.location.pathname}#${hash}`
        },
        [ shapes, targets, urlShapesPrecisionScheme, ]
    )

    const [ copyCoordinatesType, setCopyCoordinatesType ] = useSessionStorageState<CopyCoordinatesType>("copyCoordinatesType", { defaultValue: "JSON" })
    const [ canCopyCoordinates, setCanCopyCoordinates ] = useState(false)
    useEffect(
        () => {
            console.log("Enabling copy coordinates")
            setCanCopyCoordinates(true)
        },
        []
    )
    const copyCoordinates = useCallback(
        (copyCoordinatesType: CopyCoordinatesType) => {
            if (!canCopyCoordinates) {
                console.warn("Can't copy coordinates yet")
                return
            }
            const shapeText =
                copyCoordinatesType == "JS" ? shapesStr(shapeStrJS) :
                copyCoordinatesType == "Rust" ? shapesStr(shapeStrRust) :
                copyCoordinatesType == "JSON" ? shapesStr(shapeStrJSON) :
                urlStr()
            if (shapeText) {
                if (navigator.clipboard) {
                    navigator.clipboard?.writeText(shapeText)
                    console.log("Copied:", shapeText)
                } else {
                    // "This requires a secure origin — either HTTPS or localhost"
                    // https://stackoverflow.com/a/51823007
                    console.warn("No navigator.clipboard found:", shapeText)
                }
            } else {
                console.warn("No shapeText to copy")
            }
        },
        [ shapesStr, shapeStrJS, shapeStrRust, shapeStrJSON, urlStr, canCopyCoordinates ]
    )

    const setHash = useCallback(
        (hash: string) => {
            const { s, t, n, } = getHistoryState(hash)
            if (s) {
                console.log(`setting shapes from hash ${hash}:`, s.shapes, `(${s.precisionSchemeId})`)
                setInitialShapes(s.shapes)
                setUrlShapesPrecisionScheme(s.precisionSchemeId)
            } else {
                console.warn(`no s in hash ${hash}`)
            }
            if (t) {
                console.log(`setting targets from hash ${hash}:`, t)
                setTargets(t)
                if (!s) {
                    setInitialShapes(initialLayout.slice(0, t.numShapes).map(s => toShape(s)))
                }
            } else {
                console.warn(`no t in hash ${hash}`)
            }
            if (n) {
                console.log(`setting setMetadata from hash ${hash}:`, n)
                setSetMetadata(n)
            }
        },
        [ params, setInitialShapes, setTargets, initialLayout, setSetMetadata, ]
    )

    const HashLink = useCallback(
        ({ hash, children }: { hash: string, children: ReactNode }) => {
            return (
                <a
                    className={window.location.hash == hash ? css.activeLink : ''}
                    href={hash}
                    onClick={(e) => {
                        e.preventDefault()
                        console.log("Setting hash:", hash)
                        setHash(hash)
                    }}
                >{children}</a>
            )
        },
        [ setHash ]
    )

    const exampleLinkItems: LinkItem[] = [
        {
            name: "Fizz Buzz Bazz",
            description: <>Visualizations of the number of natural numbers divisible by various sets of small primes, inspired by {fizzBuzzLink}</>,
            children: <span>
                Naturals divisible by:
                {/*Converged: #t=i35,21,7,15,5,3,1&s=0zjHy6C2eF4RZ05I4g6Q82kg_YooD__EwBF-4yGGy6YuvOv&n=Divisible+by+3=3,Divisible+by+5=5,Divisible+by+7=7*/}
                {' '}<HashLink hash={"#t=i5,3,1&n=Divisible+by+3=3,Divisible+by+5=5"}>{`{3, 5}`}</HashLink>
                ,{' '}<HashLink hash={"#t=i35,21,7,15,5,3,1&n=Divisible+by+3=3,Divisible+by+5=5,Divisible+by+7=7"}>{`{3, 5, 7}`}</HashLink>
                ,{' '}<HashLink hash={"#t=i105,70,35,42,21,14,7,30,15,10,5,6,3,2,1&n=Divisible+by+2=2,Divisible+by+3=3,Divisible+by+5=5,Divisible+by+7=7"}>{`{2, 3, 5, 7}`}</HashLink>
            </span>,
        }, {
            name: "Variant callers",
            description: <>Values from {VariantCallersPaperLink}, "A comparative analysis of algorithms for somatic SNV detection in cancer," Fig. 3</>,
            children: <span>
                <HashLink hash={"#t=633,618,112,187,0,14,1,319,13,55,17,21,0,9,36&n=VarScan,SomaticSniper,Strelka=T@#99f,JSM2@orange"}>Variant Callers</HashLink>
                {' '}(
                <HashLink hash={"#s=Mzx868wSrqe62oBeRfH2WUHakKB1OeVQltXVsxzG7xr1hF4oblIulnX_D1OLV6jNkgSlDvFN0OqgyD3OUuvX_X_5HhRUwN1mnF1uXKhW4bbNv4zNby2cxv2iiFbpHovsstMTrteKR4hgh43U5qPl9TqywzTQ4efn1ARs8VrIS_u6Ew57sD7lVHg&t=633,618,112,187,0,14,1,319,13,55,17,21,0,9,36&n=VarScan,SomaticSniper,Strelka=T@#99f,JSM2@orange"}>best</HashLink>,
                {' '}<HashLink hash={"#s=MzFmMoDEjiFlaI75RLiVGFWa1LWsCUZLElD3k4Wb9MRcPZ4Fw55rJqHuFPEoGcVXr5715dyHmMD0m4hk-wsnCM54MAUEAfBJyiqu65c_DPWx0s25v7G0iFUMtLj_ah4HAMHHWffJ64khARnNgfQcpLLtcjrsqSnqPDSxMgczCQdjXopIpMOz7hg&t=633,618,112,187,0,14,1,319,13,55,17,21,0,9,36&n=VarScan,SomaticSniper,Strelka=T@#99f,JSM2@orange"}>alternate</HashLink>
                )
            </span>
        }, {
            name: "MPower",
            description: <>Values from "Clinical efficacy of atezolizumab plus bevacizumab and chemotherapy in KRAS-mutated non-small cell lung cancer with STK11, KEAP1, or TP53 computations: subgroup results from the phase III IMpower150 trial", {MPowerLink}</>,
            children: <span>
                <HashLink hash={"#t=42,15,16,10,10,12,25,182,60,23,13,44,13,18,11&n=KRAS,STK11,KEAP1=P,TP53"}>MPower</HashLink>
                {' '}(<HashLink hash={"#t=42,15,16,10,10,12,25,182,60,23,13,44,13,18,11&n=KRAS,STK11,KEAP1=P,TP53&s=MBa-DFxenUIPbbiY5zWUS75Sq6I_AoND3lCDN4c5cpbpL14Esh6Saq4ZExG4o8gjJ5dU0BbxsOy7d-X6u50CMd2V366UA1Ds8GIODVbI8YXEowhIyWjyf6ehH6Rv7XRt1FQ7iPZML4xDayY-CF36Azp1g3lboFO9072ceizTenkvUwA4t0T4bSM"}>best</HashLink>)
            </span>
        }, {
            name: "Zhang et al (2014)",
            description: <>Values from "Comparison of RNA-seq and microarray-based models for clinical endpoint prediction", <A href={Zhang2014Href}>Zhang <i>et al</i> 2014</A>, Fig. 7, plots D, E, and F.</>,
            children: <span>
                <A href={Zhang2014Href}>Zhang 2014</A> Fig. 7:
                {' '}<HashLink hash={"#t=11,89,1,24,0,66,5,2268,5,271,5,2204,24,11368,353&n=qRT-PCR@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange"}>D</HashLink>
                {' '}(<HashLink hash={"#t=11,89,1,24,0,66,5,2268,5,271,5,2204,24,11368,353&n=qRT-PCR@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange&s=MzquCc1qHJVEd39MqI0o7S6_mGGRSdwuWGwmgy3c7XFgnl4wtl91F1348bEeB_HTdcDPGo6VC8t2UKYxT-EwbfF57sa0A40Zj-Bm0Z42LRb0BuNY9qtSMtrPqjN0f0cn4ouVyooYd4wItBeD--EDMlBsOIfVgOD9prmJEtDBImoltEIQl7G2r7M"}>best</HashLink>),
                {' '}<HashLink hash={"#t=7,798,0,35,0,197,0,1097,1,569,4,303,0,3177,65&n=Microarray@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange"}>E</HashLink>
                {' '}(<HashLink hash={"#t=7,798,0,35,0,197,0,1097,1,569,4,303,0,3177,65&n=Microarray@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange&s=MzmxcXrZYyppkecbYAfg4H-PdpCaRWiDeq7N44wuiJNlIm4wp8P8cuwA9Bucsmjr2dqn1zPM22wgGd1JSY0rISvxh2mUA2aXH3ag_t6G_89D8KxZnwOU6jB2JskrLQgrA2jCCHogg4hv96qke6qJW22g22WkvD-Ra6KpOXm4rQ50Y4pkpWQmTtE"}>best</HashLink>),
                {' '}<HashLink hash={"#t=331,63,21,1,0,0,2,88,77,13,80,6,181,1,1644&n=Simulation@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange"}>F</HashLink>
                {' '}(<HashLink hash={"#t=331,63,21,1,0,0,2,88,77,13,80,6,181,1,1644&n=Simulation@#99f,Cuffdiff2,DESeq@#f99,edgeR@orange&s=MB338Q9DnKg_lC49IjUVEzmKsO8mQ6dhETFZi7x2gOAYpX4goJWRqKd0e_8WJPog2nm0bsUU2IVkhjK5WwIsdMycjSkoz0PJuyq7cdXN0cnqKBPoRCX2ecj6dr4sA-0LA6nKlMEKu4gux-1ioITfDBxjKok5trrPfC4W0Q9uecOaeAfYDVPgngg"}>best</HashLink>),
            </span>
        }, {
            name: "\"Venn Diagrams with D3.js\"",
            description: <>Example from Ben Frederickson's blog post, <A href={"https://www.benfrederickson.com/venn-diagrams-with-d3.js/"}>"Venn Diagrams with D3.js"</A>.</>,
            children: <span>
                <HashLink hash={"#t=i16,16,4,12,4,3,2&s=5zg0000200b4001KSA00i900000800g00&n=,,"}>"Venn Diagrams with D3.js"</HashLink>
            </span>
        }
    ]
    const [ clearExampleTooltip, exampleLinks ] = Links({ links: exampleLinkItems, placement: 'right', })
    const [ clearLayoutTooltip, layoutLinks ] = Links({
        links: layouts.map(({name, val, description}) => {
            const isCurVal = _.isEqual(initialLayout, val)
            return ({
                name, description,
                children: <a
                    href={window.location.hash}
                    className={isCurVal ? css.activeLink : ''}
                    onClick={e => {
                        e.preventDefault()
                        setInitialLayout(val)
                        const newShapes = val.slice(0, targets.numShapes).map(s => toShape(s))
                        setInitialShapes(newShapes)
                        pushHistoryState({shapes: newShapes, newTargets: targets, push: true})
                        console.log(`clicked link: ${name}`)
                    }}
                >
                    {name}
                </a>
            })
        }),
        placement: 'left',
    })

    // Clear URL fragment state if `stateInUrlFragment` has been set to `false`
    useEffect(
        () => {
            if (!stateInUrlFragment) {
                console.log("clearing UrlFragmentShapes")
                setUrlFragmentShapes(null)
                setUrlFragmentTargets(null)
                setUrlSetMetadata(null)
                return
            }
        },
        [ stateInUrlFragment, setUrlFragmentShapes, setUrlFragmentTargets, setUrlSetMetadata, ]
    )

    const setMetadataIsDefault = useMemo(
        () => _.isEqual(DefaultSetMetadata.slice(setMetadata.length), setMetadata),
        [ setMetadata ]
    )

    const FastForwardButton = useCallback(
        () => (
            <PlaybackControl
                title={runningState == "fwd" ? "Pause animation" : "Animate forward"}
                hotkey={"␣"}
                onClick={() => setRunningState(runningState == "fwd" ? "none" : "fwd")}
                disabled={cantAdvance}
                animating={true}
            >{
                runningState == "fwd" ? "⏸️" : "⏩"
            }</PlaybackControl>
        ),
        [ runningState, setRunningState, cantAdvance ]
    )

    const copyCurrentURLClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (!shapes) return
            // Synchronously update window.location.hash
            const href = window.location.href
            if (navigator.clipboard) {
                console.log("Copying:", href)
                navigator.clipboard.writeText(href)
            } else {
                console.warn("No navigator.clipboard found")
            }
            const shapesParam = { shapes, precisionSchemeId: urlShapesPrecisionScheme }
            setUrlFragmentShapes(shapesParam)
            setUrlFragmentTargets(rawTargets)
            setUrlSetMetadata(setMetadata)
            // console.log("setting UrlFragmentShapes:", shapes, "current hash:", window.location.hash)
        },
        [ shapes, urlShapesPrecisionScheme, rawTargets, setMetadata, ]
    )

    const svgRef = useRef<SVGSVGElement | null>(null)
    const [ svgBackgroundColor, setSvgBackgroundColor ] = useSessionStorageState<string>("svgBackgroundColor", { defaultValue: "" })
    // Use theme-based default when no custom color is set
    const effectiveSvgBg = svgBackgroundColor || diagramBg
    const [ invalidSvgColor, setInvalidSvgColor ] = useState(false)
    const [ showSaveModal, setShowSaveModal ] = useState(false)
    const savePngButton = useRef<HTMLInputElement | null>(null)
    const saveSvgButton = useRef<HTMLInputElement | null>(null)
    const SaveButton = useCallback(
        () => {
            const showProps: Partial<OverlayTriggerProps> = showSaveModal ? { show: true, /*placement: "left"*/ } : {}
            return (
                <OverlayTrigger {...showProps} overlay={<Tooltip>{
                    showSaveModal
                        ? <div className={css.saveModalBody}>
                            <p>Export as PNG or SVG:</p>
                            <p>
                                <input
                                    ref={savePngButton}
                                    type={"button"}
                                    value={"PNG"}
                                    onClick={e => {
                                        d3ToPng(`#${GridId}`, 'plot', {
                                            background: effectiveSvgBg,
                                        });
                                        console.log("called png download")
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                />
                                <input
                                    ref={saveSvgButton}
                                    type={"button"}
                                    value={"SVG"}
                                    onClick={e => {
                                        const svg = svgRef.current
                                        if (svg) {
                                            console.log("svg:", svg)
                                            const svgData = new XMLSerializer().serializeToString(svg)
                                            console.log("svgData:", svgData)
                                            const svgBlob = new Blob([svgData], { "type": "image/svg+xml;charset=utf-8" })
                                            const svgUrl = URL.createObjectURL(svgBlob)
                                            const downloadLink = document.createElement("a")
                                            downloadLink.href = svgUrl
                                            downloadLink.download = "plot.svg"
                                            document.body.appendChild(downloadLink)
                                            downloadLink.click()
                                            document.body.removeChild(downloadLink)
                                            console.log("called svg download")
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }
                                    }}
                                />
                            </p>
                        </div>
                        : "Export as PNG or SVG; click to configure"
                }</Tooltip>}>
                    <span className={css.link} onClick={e => {
                        setShowSaveModal(!showSaveModal)
                        console.log("setShowSaveModal:", !showSaveModal)
                        e.preventDefault()
                        e.stopPropagation()
                    }}>💾</span>
                </OverlayTrigger>
            )},
        [ showSaveModal, effectiveSvgBg, ]
    )

    const CopyCurrentURL = () => (
        <OverlayTrigger overlay={<Tooltip>Copy current layout to clipboard</Tooltip>}>
            <span className={css.link} onClick={copyCurrentURLClick}>🔗</span>
        </OverlayTrigger>
    )

    const SettingsGear = useCallback(
        (props: { onClick?: () => void }) => (
            <OverlayTrigger overlay={<Tooltip>Click to {settingsShown ? "hide" : "show"} settings</Tooltip>}>
                <span className={css.settingsIcon} {...props}>⚙️</span>
            </OverlayTrigger>
        ),
        [ settingsShown ]
    )

    // Maintain a body `click` listener that catches un-suppressed click events, e.g. for clearing some tooltips that
    // don't close on their own (due to managing their own open/closed state, as part of responding to both touch- and
    // mouse-events)
    useEffect(
        () => {
            const bodyClickHandler = (e: MouseEvent) => {
                console.log("body click:", e, e.target)
                clearExampleTooltip()
                clearLayoutTooltip()
                if (e.target === savePngButton.current || e.target === saveSvgButton.current) {
                    console.log("body received save-button click, passing along")
                } else {
                    if (showSaveModal) {
                        console.log(`body click closing save modal (${showSaveModal})`)
                    }
                    setShowSaveModal(false)
                }
            }
            console.log("add bodyClickHandler")
            document.body.addEventListener('click', bodyClickHandler)
            return () => {
                console.log("remove bodyClickHandler")
                document.body.removeEventListener('click', bodyClickHandler)
            }
        },
        []
    )

    return (
        <div className={css.body}>
            <div className={`${css.row} ${css.content}`}>
                <Grid
                    id={GridId}
                    className={"row"}
                    style={{ backgroundColor: effectiveSvgBg, }}
                    svgRef={svgRef}
                    resizableNodeClassName={css.svgContainer}
                    svgClassName={css.grid}
                    state={gridState}
                    resizableBottom={true}
                >
                    <>
                        {shapeNodes}
                        {edgePoints}
                        {regionTooltips}
                        {setLabels}
                        {regionPaths}
                        {intersectionNodes}
                    </>
                </Grid>
                <div className={"row"}>
                    <div className={`${col6} ${css.controlPanel}`}>
                        <div className={`${css.controls}`}>
                            <div className={css.slider}>{model && stepIdx !== null &&
                                <input
                                    type={"range"}
                                    value={stepIdx}
                                    min={0}
                                    max={model.steps.length - 1}
                                    onChange={e => {} /*setStepIdx(parseInt(e.target.value))*/}
                                    onMouseMove={e => {
                                        setVStepIdx(getSliderValue(e))
                                    }}
                                    onClick={e => {
                                        setStepIdx(getSliderValue(e))
                                        setRunningState("none")
                                    }}
                                    onMouseOut={() => {
                                        // console.log("onMouseOut")
                                        setVStepIdx(null)
                                    }}
                                />
                            }</div>
                            <div className={`${css.buttons}`}>
                                <PlaybackControl title={"Rewind to start"} hotkey={"⌘←"} onClick={() => setStepIdx(0)} disabled={cantReverse}>⏮️</PlaybackControl>
                                <PlaybackControl title={"Rewind"} hotkey={"⇧␣"} onClick={() => setRunningState(runningState == "rev" ? "none" : "rev")} disabled={cantReverse} animating={true}>{runningState == "rev" ? "⏸️" : "⏪️"}</PlaybackControl>
                                <PlaybackControl title={"Reverse one step"} hotkey={"←"} onClick={() => revStep()} disabled={cantReverse}>⬅️</PlaybackControl>
                                <PlaybackControl title={`Advance one ${stepIdx !== null && model && stepIdx + 1 == model.steps.length ? `batch (${stepBatchSize} steps)` : "step"}`} hotkey={"→"} onClick={() => fwdStep()} disabled={cantAdvance || stepIdx == maxSteps}>➡️</PlaybackControl>
                                <FastForwardButton />
                                <PlaybackControl title={"Jump to last computed step"} hotkey={"⌘→"} onClick={() => {
                                    if (!model) return
                                    setStepIdx(model.steps.length - 1)
                                    // console.log("setDopanZoom(): warp to end")
                                    panZoom()
                                }} disabled={!model || stepIdx === null || stepIdx + 1 == model.steps.length}>⏭️</PlaybackControl>
                            </div>
                            <div className={css.stepStats}>
                                <p>Step {stepIdx}{ curStep && error && <span>, error: {(error.v * curStep.targets.total_area).toPrecision(3)}</span> }</p>
                                <p
                                    onTouchStart={e => {
                                        if (!model) return
                                        // console.log("touchstart:", e.touches, e, "setting min_idx", model.min_idx)
                                        setStepIdx(model.min_idx)
                                        setRunningState("none")
                                        e.stopPropagation()
                                    }}
                                    onMouseMove={() => {
                                        if (!model || runningState != 'none') return
                                        // console.log("mousemove set to min_idx", model.min_idx)
                                        setVStepIdx(model.min_idx)
                                        // setRunningState("none")
                                    }}
                                    onMouseOut={() => {
                                        // console.log("mousout vidx null")
                                        setVStepIdx(null)
                                    }}
                                    onClick={() => {
                                        if (!model) return
                                        // console.log("click min_idx", model.min_idx)
                                        setStepIdx(model.min_idx)
                                        setRunningState("none")
                                    }}
                                >{
                                    model && curStep && bestStep && <span className={stepIdx == model.min_idx && runningState == 'none' && stepIdx > 0 ? css.bestStepActive : ''}>
                                        Best step: {model.min_idx}, error: {(bestStep.error.v * curStep.targets.total_area).toPrecision(3)} ({(bestStep.error.v * 100).toPrecision(3)}%)
                                    </span>
                                }</p>
                                {/*<p>History length: {history.length}</p>*/}
                                {repeatSteps && stepIdx == repeatSteps[1] ?
                                    <p className={css.repeatSteps}>♻️ Step {repeatSteps[1]} repeats step {repeatSteps[0]}</p> :
                                    <p className={`${css.repeatSteps} ${css.invisible}`}>♻️ Step {"?"} repeats step {"?"}</p>
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`${col6} ${css.settings}`}>
                        <Details
                            open={settingsShown}
                            toggle={setSettingsShown}
                            summary={<>
                                <SaveButton />
                                <CopyCurrentURL />
                                <SettingsGear />
                            </>}
                        >
                            <Number
                                label={"Max error ratio step size"}
                                tooltip={"On each step, advance (along the gradients toward lower error) by this fraction of the current overall error"}
                                value={maxErrorRatioStepSize} setValue={setMaxErrorRatioStepSize}
                                float={true} min={0} max={1.2} step={0.1}
                            />
                            <Number label={"Max steps"} value={maxSteps} setValue={setMaxSteps} />
                            <Number label={"Step batch size"} tooltip={"Advance by this many steps at a time (when at the end of the current model's history)"} className={css.shortNumberInput} value={stepBatchSize} setValue={setStepBatchSize} />
                            <Checkbox label={"Intersections"} checked={showIntersectionPoints} setChecked={setShowIntersectionPoints} />
                            <Checkbox label={"Grid"} checked={showGrid} setChecked={setShowGrid} />
                            {/*<Checkbox label={"Edge points"} checked={showEdgePoints} setChecked={setShowEdgePoints} />*/}
                            <Checkbox label={"Auto-center"} checked={autoCenter} setChecked={setAutoCenter} />
                            <Checkbox label={"State in URL"} checked={stateInUrlFragment} setChecked={setStateInUrlFragment} />
                            <Checkbox label={"Region sizes"} checked={showRegionSizes} setChecked={setShowRegionSizes} />
                            <Select
                                label={"URL shapes precision"}
                                tooltip={<>
                                    <p>{"Number of bits of precision to use for each shape's coordinates in URL: <mantissa>e<exponent>"}</p>
                                    <p>Enables trading off some precision for shorter URLs</p>
                                </>}
                                value={urlShapesPrecisionScheme}
                                setValue={setUrlShapesPrecisionScheme}>{
                                precisionSchemes.map(({id, mantBits, expBits}, idx) =>
                                    <option key={idx} value={idx}>{mantBits}e{expBits}</option>
                                )
                            }</Select>
                            <Number label={"Sparklines"} className={css.shortNumberInput} value={sparkLineLimit} setValue={setSparkLineLimit}>
                                <input
                                    type={"checkbox"}
                                    checked={showSparkLines}
                                    onChange={e => setShowSparkLines(e.target.checked)}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </Number>
                            <Select
                                label={"WASM log level"}
                                tooltip={<span>Set logging verbosity in WASM module (<A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>)</span>}
                                value={logLevel}
                                setValue={setLogLevel}
                            >{
                                ["debug", "info", "warn"].map(level =>
                                    <option key={level} value={level}>{level}</option>
                                )
                            }</Select>
                            <Control label={"SVG background"}>
                                <EditableText
                                    className={`${css.svgBackgroundColorInput} ${invalidSvgColor ? css.invalid : ""}`}
                                    defaultValue={svgBackgroundColor}
                                    onBlur={() => setInvalidSvgColor(false)}
                                    onChange={(newColor) => {
                                        if (CSS.supports("background-color", newColor)) {
                                            console.log("new svg color:", newColor)
                                            setSvgBackgroundColor(newColor)
                                            setInvalidSvgColor(false)
                                        } else if (newColor === '') {
                                            newColor = 'white'
                                            console.log("default svg color:", newColor)
                                            setSvgBackgroundColor(newColor)
                                            setInvalidSvgColor(false)
                                        } else {
                                            setInvalidSvgColor(true)
                                            console.log("invalid svg color:", newColor)
                                        }
                                    }}
                                />
                            </Control>
                        </Details>
                    </div>
                </div>
                <hr />
                <div className={"row"}>
                    <div className={`${col7}`}>
                        <DetailsSection
                            title={"Targets"}
                            open={targetsShown}
                            toggle={setTargetsShown}
                            tooltip={"Desired sizes for each subset, and current deltas/errors"}
                            className={css.targets}
                        >
                            {
                                model && curStep && targets && error && sparkLineCellProps &&
                                <TargetsTable
                                    initialSets={initialSets}
                                    targets={rawTargets}
                                    setTargets={newTargets => {
                                        setTargets(newTargets)
                                        setUrlFragmentTargets(newTargets)
                                        pushHistoryState({ shapes, newTargets })
                                    }}
                                    showDisjointSets={!rawTargets.givenInclusive}
                                    curStep={curStep}
                                    error={error}
                                    hoveredRegion={hoveredRegion}
                                    {...sparkLineCellProps}
                                />
                            }
                            <Checkbox
                                label={"Disjoint sets"}
                                tooltip={<span>
                                    Express target sizes for "inclusive" (e.g. <code>A**</code>: A's overall size) vs. "exclusive" (<code>A--</code>: A and not B or C) sets
                                </span>}
                                checked={!rawTargets.givenInclusive}
                                setChecked={showDisjointSets => setTargets(t => ({ ...t, givenInclusive: !showDisjointSets }))}
                            />
                        </DetailsSection>
                        <DetailsSection
                            title={"Examples"}
                            open={examplesShown}
                            toggle={setExamplesShown}
                            tooltip={"Sample \"target\" sets (region and overlap sizes) to gradient descend toward"}
                        >
                            {exampleLinks}
                        </DetailsSection>
                        <DetailsSection
                            title={"Error Plot"}
                            open={errorPlotShown}
                            toggle={setErrorPlotShown}
                            tooltip={"Overall error (sum of differences between actual and target region sizes) over time"}
                            onMouseOut={() => setVStepIdx(null)}
                        >
                            {plot}
                        </DetailsSection>
                    </div>
                    <div className={col5}>
                        <DetailsSection
                            title={"Shapes"}
                            open={shapesShown}
                            toggle={setShapesShown}
                            tooltip={"\"Wide\" version of the \"Vars\" table above. View shapes' dimensions/coordinates, copy to clipboard"}
                        >
                            {
                                vars &&
                                <ShapesTable
                                    sets={sets || []}
                                    setShape={(idx, shape) => {
                                        if (!shapes) return
                                        const newShapes = shapes.map((s, i) => i == idx ? shape : s)
                                        setInitialShapes(newShapes)
                                        setUrlFragmentShapes({ shapes: newShapes, precisionSchemeId: urlShapesPrecisionScheme })
                                    }}
                                    updateSetMetadatum={(idx, newMetadatum) => {
                                        setSetMetadata(setMetadata => {
                                            const newSetMetadata = setMetadata.slice()
                                            const cur = newSetMetadata[idx] || DefaultSetMetadata[idx]
                                            console.log(`Updating setMetadata:`, setMetadata, `newMetadata[${idx}]:`, newSetMetadata[idx], newMetadatum)
                                            newSetMetadata[idx] = { ...cur, ...newMetadatum }
                                            console.log("setUrlSetMetadata:", newSetMetadata)
                                            setUrlSetMetadata(newSetMetadata)
                                            if (shapes) {
                                                pushHistoryState( { shapes, newTargets: targets, newSetMetadata })
                                            }
                                            return newSetMetadata
                                        })
                                    }}
                                    vars={vars}
                                />
                            }
                            <div>
                                <OverlayTrigger overlay={<Tooltip>Copy current layout to clipboard</Tooltip>}>
                                    <span>
                                        <ClipboardSvg className={css.clipboardSvg} onClick={() => copyCoordinates(copyCoordinatesType)}/>
                                    </span>
                                </OverlayTrigger>
                                as{' '}
                                <select
                                    value={copyCoordinatesType}
                                    onChange={e => {
                                        const newCopyCoordinatesType = e.target.value as CopyCoordinatesType
                                        console.log("newCopyCoordinatesType:", newCopyCoordinatesType)
                                        setCopyCoordinatesType(newCopyCoordinatesType)
                                        copyCoordinates(newCopyCoordinatesType)
                                    }}
                                >
                                    <option value={"JS"}>JS</option>
                                    <option value={"Rust"}>Rust</option>
                                    <option value={"JSON"}>JSON</option>
                                    <option value={"URL"}>URL</option>
                                </select>
                                {' '}
                                <OverlayTrigger overlay={<Tooltip>
                                    Reset shapes' metadata (names, abbreviations, colors) to default values
                                </Tooltip>}>
                                    <span
                                        className={setMetadataIsDefault ? css.resetMetadataDisabled : css.resetMetadata}
                                        onClick={() => {
                                            if (setMetadataIsDefault) return
                                            setSetMetadata(DefaultSetMetadata.slice())
                                            setUrlSetMetadata(DefaultSetMetadata.slice())
                                            if (shapes) {
                                                pushHistoryState({ shapes, newTargets: targets, newSetMetadata: DefaultSetMetadata.slice() })
                                            }
                                        }}
                                    >🗑️</span>
                                </OverlayTrigger>
                            </div>
                        </DetailsSection>
                        <DetailsSection
                            title={"Layouts"}
                            open={layoutsShown}
                            toggle={setLayoutsShown}
                            tooltip={"Example shape arrangements (to start gradient descent from)"}
                        >{
                            layoutLinks
                        }</DetailsSection>
                        <DetailsSection
                            title={"Vars"}
                            open={varsShown}
                            toggle={setVarsShown}
                            tooltip={"Shapes' coordinates: raw values, and overall error gradient with respect to each coordinate"}
                        >{
                            curStep && vars && sets && error && sparkLineCellProps &&
                            <VarsTable
                                vars={vars}
                                sets={sets}
                                curStep={curStep}
                                error={error}
                                {...sparkLineCellProps}
                            />
                        }</DetailsSection>
                    </div>
                </div>
                <hr />
                <div className={`row`}>
                    <div className={col12}>
                        <h2 id={"readme"}><span style={{fontWeight: "bold"}}>∧</span>p<span style={{fontWeight: "bold"}}>∨</span>d</h2>
                        <p>Area-Proportional Venn-Diagrams</p>
                        <p>Given "target" values (desired sizes for up to 4 sets, and all possible subsets):</p>
                        <ul>
                            <li>Model each set with an ellipse</li>
                            <li>Compute intersections and areas (using "<A href={"https://en.wikipedia.org/wiki/Dual_number"}>dual numbers</A>" to preserve derivatives)</li>
                            <li>Gradient-descend shapes' coordinates (against overall error) until areas match targets</li>
                        </ul>
                        <h3 id={"usage"}>Usage</h3>
                        <ul>
                            <li>Click <FastForwardButton /> to continuously adjust the shapes to overlap closer to the desired values</li>
                            <li>
                                Inspect and edit sections:
                                <ul>
                                    <li><strong>Targets</strong>: current target values (editable)</li>
                                    <li><strong>Examples</strong>: sample target values, set names, and colors</li>
                                    <li><strong>Error Plot</strong>: overall error over time</li>
                                    <li><strong>Shapes</strong>: names and colors (editable), view/copy current coordinates</li>
                                    <li><strong>Layouts</strong>: sample shape-arrangements, from which to grandient-descend toward given "targets"</li>
                                    <li><strong>Vars</strong>: shape coordinates and gradients</li>
                                </ul>
                            </li>
                            <li>
                                Inspect and edit gradient-descent parameters and other settings under
                                <span
                                    className={css.settingsGearInline}
                                    onClick={() => setSettingsShown(!settingsShown)}
                                >
                                    <SettingsGear />
                                </span>
                            </li>
                        </ul>
                        <h3>See also</h3>
                        <ul>
                            <li><strong><A href={"https://github.com/runsascoded/apvd"}>runsascoded/apvd</A></strong>: repository for this app; <A href={"https://github.com/runsascoded/apvd#readme"}>README</A> includes <A href={"https://github.com/runsascoded/apvd#background"}>background</A>, <A href={"https://github.com/runsascoded/apvd#prior-art"}>prior art</A>, <A href={"https://github.com/runsascoded/apvd#methods"}>methods</A>, etc.</li>
                        <li><strong><A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A></strong>: differentiable shape-intersections in Rust (compiled to WASM for use here)</li>
                            <li><strong><A href={"/ellipses"}>Ellipse-intersection demo</A></strong> (earlier version, draggable but non-differentiable)</li>
                        </ul>
                    </div>
                </div>
            </div>
            <Fab />
        </div>
    )
}
