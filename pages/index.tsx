'use client'

import Grid, {GridState} from "../src/components/grid"
import React, {DetailedHTMLProps, Dispatch, HTMLAttributes, InputHTMLAttributes, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react"
import * as apvd from "apvd"
import {train, update_log_level} from "apvd"
import {makeModel, Model, Region, Step} from "../src/lib/regions"
import {Point} from "../src/components/point"
import css from "./index.module.scss"
import A from "next-utils/a"
import dynamic from "next/dynamic"
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import {entries, fromEntries, values} from "next-utils/objs";
import {getSliderValue} from "../src/components/inputs";
import {cos, max, min, PI, pi2, pi4, round, sin, sq3, sqrt} from "../src/lib/math";
import Apvd, {LogLevel} from "../src/components/apvd";
import {getMidpoint, getPointAndDirectionAtTheta, getRegionCenter} from "../src/lib/region";
import {BoundingBox, getRadii, mapShape, rotate, S, Set, shapeBox, shapeStrJS, shapeStrJSON, shapeStrRust, Shape, shapesParam} from "../src/lib/shape";
import {TargetsTable} from "../src/components/tables/targets";
import {makeTargets, Target, Targets, targetsParam} from "../src/lib/targets";
import {Disjoint, Ellipses4, Ellipses4t, InitialLayout, SymmetricCircleDiamond, toShape} from "../src/lib/layout";
import {VarsTable} from "../src/components/tables/vars";
import {SparkLineProps} from "../src/components/spark-lines";
import {CircleCoord, CircleCoords, CircleFloatGetters, Coord, makeVars, VarCoord, Vars, XYRRCoord, XYRRCoords, XYRRFloatGetters, XYRRTCoord, XYRRTCoords, XYRRTFloatGetters} from "../src/lib/vars";
import {ShapesTable} from "../src/components/tables/shapes";
import useLocalStorageState from 'use-local-storage-state'
import _ from "lodash"
import {boolParam, getHashMap, intParam, Param, ParsedParam, parseHashParams, updatedHash, updateHashParams} from "next-utils/params";
import CopyLayout from "../src/components/copy-layout"
import {precisionSchemes, ShapesParam} from "../src/lib/shapes-buffer";
import {Checkbox, Number, Select} from "../src/components/controls";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export const colors = [
    '#f99',  // red
    'green',
    'orange',
    '#99f',  // blue
]

const ThreeEqualCircles: Target[] = [
    [ "0**", PI ],
    [ "*1*", PI ],
    [ "**2", PI ],
    [ "01*", 2*PI/3 - sqrt(3)/2 ],
    [ "0*2", 2*PI/3 - sqrt(3)/2 ],
    [ "*12", 2*PI/3 - sqrt(3)/2 ],
    [ "012", PI/2 - sqrt(3)/2 ],
]

const FizzBuzz: Target[] = [
    [ "0*", 1/3 ],
    [ "*1", 1/5 ],
    [ "01", 1/15 ],
]

const FizzBuzzBazz: Target[] = [ // Fractions scaled up by LCM
    [ "0**", 35 ],  // 1 / 3
    [ "*1*", 21 ],  // 1 / 5
    [ "**2", 15 ],  // 1 / 7
    [ "01*",  7 ],  // 1 / 15
    [ "0*2",  5 ],  // 1 / 21
    [ "*12",  3 ],  // 1 / 35
    [ "012",  1 ],  // 1 / 105
]

const FizzBuzzBazzQux: Target[] = [ // Fractions scaled up by LCM
    [ "0***", 105 ],  // 1 / 2
    [ "*1**",  70 ],  // 1 / 3
    [ "**2*",  42 ],  // 1 / 5
    [ "***3",  30 ],  // 1 / 7
    [ "01**",  35 ],  // 1 / 6
    [ "0*2*",  21 ],  // 1 / 10
    [ "0**3",  15 ],  // 1 / 14
    [ "*12*",  14 ],  // 1 / 15
    [ "*1*3",  10 ],  // 1 / 21
    [ "**23",   6 ],  // 1 / 35
    [ "012*",   7 ],  // 1 / 30
    [ "01*3",   5 ],  // 1 / 42
    [ "0*23",   3 ],  // 1 / 70
    [ "*123",   2 ],  // 1 / 105
    [ "0123",   1 ],  // 1 / 210
]

const CentroidRepel: Target[] = [
    [ "0**", 3.  ],
    [ "*1*", 1.  ],
    [ "**2", 1.  ],
    [ "01*", 0.3 ],
    [ "0*2", 0.3 ],
    [ "*12", 0.3 ],
    [ "012", 0.1 ],
]

// Cenomic variants identified by 4 variant callers: VarScan, SomaticSniper, Strelka, JSM2
// cf. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf, ../4-ellipses.png
const VariantCallers: Target[] = [
    [ "0---", 633 ],
    [ "-1--", 618 ],
    [ "--2-", 187 ],
    [ "---3", 319 ],
    [ "01--", 112 ],
    [ "0-2-",   0 ],
    [ "0--3",  13 ],
    [ "-12-",  14 ],
    [ "-1-3",  55 ],
    [ "--23",  21 ],
    [ "012-",   1 ],
    [ "01-3",  17 ],
    [ "0-23",   0 ],
    [ "-123",   9 ],
    [ "0123",  36 ],
]

export type RunningState = "none" | "fwd" | "rev"

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

export type LinkItem<Val> = { name: string, val: Val, description: ReactNode }
export function Links<Val>({ links, cur, setVal, activeVisited, }: {
    links: LinkItem<Val>[]
    cur: Val
    setVal: Dispatch<Val>
    activeVisited?: boolean
}): [ () => void, ReactNode ] {
    const [ showTooltip, setShowTooltip ] = useState<string | null>(null)
    return [
        () => setShowTooltip(null),
        <ul style={{ listStyle: "none", }}>{
            links.map(({ name, val, description }, idx) => {
                const overlay = <Tooltip onClick={e => console.log("tooltip click:", name)}>{description}</Tooltip>
                const isCurVal = _.isEqual(cur, val)
                // console.log("link:", isCurVal, cur, val)
                const a = (className?: string) => <a className={className || ''} href={window.location.hash} onClick={e => {
                    setVal(val)
                    setShowTooltip(null)
                    e.preventDefault()
                    e.stopPropagation()
                    console.log(`clicked link: ${name}`)
                }}>{name}</a>
                return (
                    <li key={idx}>
                        {
                            isCurVal
                                ? (
                                    activeVisited
                                        ? a(css.activeLink)
                                        : <span>{name}</span>
                                ) : a()
                        }
                        {' '}
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
                            placement={"right"}
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
                    </li>
                )
            })
        }</ul>
    ]
}

export default function Page() {
    return <Apvd>{() => <Body />}</Apvd>
}

declare var window: any;

export const initialLayoutKey = "initialLayout"
export const shapesKey = "shapes"
export const targetsKey = "targets"

const layouts: LinkItem<InitialLayout>[] = [
    { name: "Ellipses", val: Ellipses4t, description: "4 ellipses intersecting to form all 15 possible regions, rotated -45°", },
    { name: "Ellipses (axis-aligned)", val: Ellipses4, description: "Same as above, but ellipse axes are horizontal/vertical (and rotation is disabled)", },
    { name: "CircleDiamond", val: SymmetricCircleDiamond, description: "4 circles in a diamond shape, such that 2 different subsets (of 3) are symmetric, and 11 of 15 possible regions are represented (missing 2 4C2's and 2 4C3's).", },
    { name: "Disjoint", val: Disjoint, description: "4 disjoint circles" },
    // { name: "CircleLattice", layout: SymmetricCircleLattice, description: "4 circles centered at (0,0), (0,1), (1,0), (1,1)", },
]
const layoutsMap = new Map(layouts.map(({ name, val }) => [ name, val ]))

type Params = {
    s: Param<ShapesParam | null>
    t: Param<Targets | null>
}

type ParsedParams = {
    s: ParsedParam<ShapesParam | null>
    t: ParsedParam<Targets | null>
}

export function Body() {
    const fizzBuzzLink = <A href={"https://en.wikipedia.org/wiki/Fizz_buzz"}>Fizz Buzz</A>
    const exampleTargets: LinkItem<Targets>[] = [
        { name: "Fizz Buzz", val: FizzBuzz, description: <>2 circles, of size 1/3 and 1/5, representing integers divisible by 3 and by 5. Inspired by {fizzBuzzLink}.</> },
        { name: "Fizz Buzz Bazz", val: FizzBuzzBazz, description: <>Extended version of {fizzBuzzLink} above, with 3 sets, representing integers divisible by 3, 5, or 7. This is impossible to model accurately with 3 circles, but possible with ellipses.</> },
        { name: "Fizz Buzz Bazz Qux", val: FizzBuzzBazzQux, description: <>Extended version of {fizzBuzzLink} above, with 4 sets, representing integers divisible by 2, 3, 5, or 7. Impossible to model exactly even with 4 ellipses (AFAIK!), but gradient descent gets as close as it can.</> },
        { name: "3 symmetric sets", val: ThreeEqualCircles, description: <>Simple test case, 3 circles, one starts slightly off-center from the other two, "target" ratios require the 3 circles to be in perfectly symmetric position with each other.</> },
        { name: "Variant callers", val: VariantCallers, description: <>Values from <A href={"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf"}>Roberts et al (2013)</A>, "A comparative analysis of algorithms for somatic SNV detection
                in cancer," Fig. 3</>}
    ].map(({ name, val, description }) => ({ name, val: makeTargets(val), description }))

    const [ logLevel, setLogLevel ] = useLocalStorageState<LogLevel>("logLevel", { defaultValue: "info" })
    useEffect(
        () => {
            update_log_level(logLevel)
        },
        [ logLevel, ]
    );

    const [ initialLayout, setInitialLayout] = useLocalStorageState<InitialLayout>(initialLayoutKey, { defaultValue:
        SymmetricCircleDiamond
        // SymmetricCircleLattice
        // Disjoint
        // Ellipses4t
        // Ellipses4t2
        // Ellipses4
        // TwoOverOne
        // Lattice_0_1
    })
    // const [ shapesInUrlFragment, setShapesInUrlFragment ] = useState<boolean>(false)

    const [ urlShapesPrecisionScheme, setUrlShapesPrecisionScheme ] = useLocalStorageState<number>("urlShapesPrecisionScheme", { defaultValue: 6 })

    const params: Params = {
        s: shapesParam({ precisionSchemeId: 6 }),
        t: targetsParam,
    }

    const [ stateInUrlFragment, setStateInUrlFragment ] = useLocalStorageState<boolean>("shapesInUrlFragment", { defaultValue: false })

    const {
        s: [ urlFragmentShapes, setUrlFragmentShapes ],
        t: [ urlFragmentTargets, setUrlFragmentTargets ],
    }: ParsedParams = parseHashParams({ params })

    // console.log("render: urlFragmentShapes", urlFragmentShapes)

    const [ initialShapes, setInitialShapes ] = useState<Shape<number>[]>(() => {
        // console.log("initialShapes: hash", window.location.hash)
        if (urlFragmentShapes) {
            console.log("found urlFragmentShapes:", urlFragmentShapes)
            setUrlFragmentShapes(null)
            setUrlShapesPrecisionScheme(urlFragmentShapes.precisionSchemeId)
            return urlFragmentShapes.shapes
        } else {
            console.log("no urlFragmentShapes found")
        }
        const str = localStorage.getItem(shapesKey)
        if (!str) return initialLayout.map(s => toShape(s))
        return JSON.parse(str)
    })

    // console.log("initialLayout:", initialLayout)
    // console.log("initialShapes:", initialShapes)
    const [ rawTargets, setTargets ] = useState<Targets>(() => {
        if (urlFragmentTargets) {
            console.log("found urlFragmentTargets:", urlFragmentTargets)
            setUrlFragmentTargets(null)
            return urlFragmentTargets
        }
        const str = localStorage.getItem(targetsKey)
        const entries = str ? JSON.parse(str) : (
            // FizzBuzz
            FizzBuzzBazz
            // FizzBuzzBazzQux
            // VariantCallers
            // ThreeEqualCircles
            // CentroidRepel
        )
        return makeTargets(entries)
    })

    // Layer of indirection around `rawTargets`, to ensure `initialSets` and `targets` are updated atomically.
    // Otherwise, changing targets / numbers of shapes can result in intermediate renders with inconsistent sizes of
    // shape- and target-arrays.
    const { targets, initialSets  } = useMemo(
        () => {
            const targets = rawTargets
            // const targets = rawTargets
            const { numShapes } = targets

            const initialSets =
                initialShapes
                    .slice(0, numShapes)
                    .map((s, idx) => {
                        const shape = toShape(s)
                        return {
                            idx,
                            name: String.fromCharCode('A'.charCodeAt(0) + idx),
                            color: colors[idx],
                            shape: shape,
                        }
                    })

            console.log("updated targets block:", numShapes, targets, initialSets, "layout:", initialLayout.length)
            return { targets, initialSets, }
        },
        [ rawTargets.all, rawTargets.numShapes, initialShapes ]
    )

    const gridState = GridState({
        localStorage: true,
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

    const [ settingsShown, setSettingsShown ] = useLocalStorageState("settingsShown", { defaultValue: false, })
    const [ targetsShown, setTargetsShown ] = useLocalStorageState("targetsShown", { defaultValue: false, })
    const [ examplesShown, setExamplesShown ] = useLocalStorageState("examplesShown", { defaultValue: false, })
    const [ errorPlotShown, setErrorPlotShown ] = useLocalStorageState("errorPlotShown", { defaultValue: false, })
    const [ varsShown, setVarsShown ] = useLocalStorageState("varsShown", { defaultValue: false, })
    const [ shapesShown, setShapesShown ] = useLocalStorageState("shapesShown", { defaultValue: false, })
    const [ layoutsShown, setLayoutsShown ] = useLocalStorageState("layoutsShown", { defaultValue: false, })

    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useLocalStorageState("maxErrorRatioStepSize", { defaultValue: 0.5 })
    const [ maxSteps, setMaxSteps ] = useLocalStorageState("maxSteps", { defaultValue: 10000 })
    const [ stepBatchSize, setStepBatchSize ] = useLocalStorageState("stepBatchSize", { defaultValue: 10 })

    const [ model, setModel ] = useState<Model | null>(null)
    const [ modelStepIdx, setModelStepIdx ] = useState<number | null>(null)
    const [ vStepIdx, setVStepIdx ] = useState<number | null>(null)
    const [ runningState, setRunningState ] = useState<RunningState>("none")
    const [ frameLen, setFrameLen ] = useState(0)
    const [ autoCenter, setAutoCenter ] = useLocalStorageState("autoCenter", { defaultValue: true })
    const [ autoCenterInterpRate, setAutoCenterInterpRate ] = useState(1)
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

    const [ curStep, sets, shapes, ] = useMemo(
        () => {
            if (!model || stepIdx === null) return [ null, null ]
            const curStep = model.steps[stepIdx]
            // Save current shapes to localStorage
            const shapes = curStep.sets.map(({ shape }) => shape)
            localStorage.setItem(shapesKey, JSON.stringify(shapes))
            const sets = curStep.sets.map(set => ({ ...initialSets[set.idx], ...set, }))
            return [ curStep, sets, shapes ]
        },
        [ model, stepIdx, initialSets, ]
    )

    // Save targets to localStorage
    useEffect(
        () => {
            localStorage.setItem(targetsKey, JSON.stringify(rawTargets))
        },
        [ rawTargets, ]
    )

    // Save latest `model` to `window`, for debugging
    useEffect(
        () => {
            if (typeof window !== 'undefined') {
                window.model = model
            }
        },
        [ model,]
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
            const newRawModel: apvd.Model = {
                steps: model.raw.steps.concat(batch.raw.steps.slice(1)),
                repeat_idx: batch.repeat_idx ? batch.repeat_idx + model.raw.steps.length - 1 : null,
                min_idx,
                min_error,
            }
            const newModel: Model = {
                steps,
                repeat_idx: batch.repeat_idx ? batch.repeat_idx + model.raw.steps.length - 1 : null,
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

    // Keyboard shortcuts
    useEffect(() => {
        const keyDownHandler = (e: KeyboardEvent) => {
            // console.log(`keydown: ${e.code}, shift ${e.shiftKey}, alt ${e.altKey}, meta ${e.metaKey}`)
            switch (e.code) {
                case 'ArrowRight':
                    e.preventDefault()
                    e.stopPropagation()
                    if (cantAdvance) return
                    if (e.metaKey) {
                        if (model) {
                            setStepIdx(model.steps.length - 1)
                        }
                    } else {
                        fwdStep(e.shiftKey ? 10 : undefined)
                    }
                    setRunningState("none")
                    break
                case 'ArrowLeft':
                    e.preventDefault()
                    e.stopPropagation()
                    if (cantReverse) return
                    if (e.metaKey) {
                        setStepIdx(0)
                    } else {
                        revStep(e.shiftKey ? 10 : 1)
                    }
                    setRunningState("none")
                    break
                case 'Space':
                    e.preventDefault()
                    e.stopPropagation()
                    if (e.shiftKey) {
                        if (cantReverse) return
                        setRunningState(runningState == "rev" ? "none" : "rev")
                    } else {
                        if (cantAdvance) return
                        setRunningState(runningState == "fwd" ? "none" : "fwd")
                    }
                    break
            }
        }
        document.addEventListener("keydown", keyDownHandler);

        // clean up
        return () => {
            document.removeEventListener("keydown", keyDownHandler);
        };
    }, [ fwdStep, revStep, cantAdvance, cantReverse, setRunningState, runningState, setStepIdx, ]);

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
                <Plot
                    className={css.plot}
                    style={plotInitialized ? {} : { display: "none", }}
                    data={[
                        {
                            // x: steps.map((_: Step, idx: number) => xlo + idx),
                            y: steps.map(step => step.error.v),
                            type: 'scatter',
                            mode: 'lines',
                            marker: { color: 'red' },
                        },
                    ]}
                    layout={{
                        dragmode: 'pan',
                        hovermode: 'x',
                        margin: { t: 0, l: 40, r: 0, b: 40, },
                        xaxis: {
                            title: 'Step',
                            rangemode: 'tozero',
                            // range: [ xlo, xhi ],
                        },
                        yaxis: {
                            title: 'Error',
                            type: 'log',
                            fixedrange: true,
                            rangemode: 'tozero',
                            // ...yAxis,
                            // range: [-10, 10],
                        },
                        shapes: /*stepIdx + 1 < model.steps.length ?*/ [{
                            type: 'line',
                            x0: stepIdx,
                            x1: stepIdx,
                            xref: 'x',
                            y0: 0,
                            y1: 1,
                            yref: 'paper',
                            fillcolor: 'grey',
                        }] /*: []*/
                    }}
                    config={{ displayModeBar: false, /*scrollZoom: true,*/ responsive: true, }}
                    onInitialized={() => {
                        console.log("plot initialized")
                        setPlotInitialized(true)
                    }}
                    onRelayout={(e: any) => {
                        console.log("relayout:", e)
                    }}
                    onHover={(e: any) => {
                        const vStepIdx = round(e.xvals[0])
                        // console.log("hover:", e, vStepIdx)
                        setVStepIdx(vStepIdx)
                    }}
                />
                {!plotInitialized &&
                    <div className={css.plot}>
                        Loading plot...
                    </div>
                }
            </>
        },
        [ model, stepIdx, plotInitialized, ],
    )

    const [ showSparkLines, setShowSparkLines ] = useLocalStorageState("showSparkLines", { defaultValue: true })
    const [ sparkLineLimit, setSparkLineLimit ] = useLocalStorageState("sparkLineLimit", { defaultValue: 40 })
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
                <span>
                    <Button
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
                const ellipse = <ellipse key={idx} rx={rx}  ry={ry} {...props} />
                return degrees ? <g key={idx} transform={`rotate(${degrees} ${cx} ${cy})`}>{ellipse}</g> : ellipse
            })
        }</g>,
        [ sets, scale ],
    )

    const [ showIntersectionPoints, setShowIntersectionPoints ] = useLocalStorageState("showIntersectionPoints", { defaultValue: false })
    const intersectionNodes = useMemo(
        () => showIntersectionPoints && <g id={"intersections"}>{
            curStep && ([] as ReactNode[]).concat(...curStep.components.map((component, componentIdx) => component.points.map(({ x, y, }, pointIdx) => {
                return (
                    <OverlayTrigger
                        key={`${componentIdx}-${pointIdx}`}
                        overlay={
                            <Tooltip>
                                <div>x: {x.v.toPrecision(4)}</div>
                                <div>y: {y.v.toPrecision(4)}</div>
                            </Tooltip>
                        }>
                        <circle
                            cx={x.v}
                            cy={y.v}
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
                regionAreas[key] += area.v
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
                if (!(key in largestRegions) || largestRegions[key].area.v < area.v) {
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
            const setLabelPoints: { [name: string]: Point } = {}
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
                    const r = setLabelDistance
                    const x = point.x + r * cos(normal)
                    const y = point.y + r * sin(normal)
                    // console.log(name, edge, point, degStr(direction), degStr(normal))
                    setLabelPoints[name] = { x, y }
                })
            return setLabelPoints
        },
        [ exteriorRegions, setLabelDistance, ]
    )
    const setLabels = useMemo(
        () => setLabelPoints && <g id={"setLabels"}>{
            entries(setLabelPoints).map(([ label, { x, y } ]) => {
                return (
                    <text
                        key={label}
                        transform={`translate(${x}, ${y}) scale(1, -1)`}
                        textAnchor={"middle"}
                        dominantBaseline={"middle"}
                        className={css.setLabel}
                        fontSize={setLabelSize / scale}
                    >{label}</text>
                )
            })
        }</g>,
        [ setLabelPoints, setLabelDistance, ]
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
            return setLabelPoints ? values(setLabelPoints).reduce<BoundingBox<number>>(
                (box, { x, y }) => [{
                    x: min(x, box[0].x),
                    y: min(y, box[0].y),
                }, {
                    x: max(x, box[1].x),
                    y: max(y, box[1].y),
                }],
                shapesBox
            ) : shapesBox
        },
        [ curStep, setLabelPoints, ]
    )

    const panZoom = useCallback(
        (interp: number) => {
            if (!boundingBox || !interp) return
            const [ lo, hi ] = boundingBox
            const sceneCenter = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, }
            const width = hi.x - lo.x
            const height = hi.y - lo.y
            const sceneScale = min(gridWidth / width, gridHeight / height) * 0.9
            const newCenter = {
                x: gridCenter.x + (sceneCenter.x - gridCenter.x) * interp,
                y: gridCenter.y + (sceneCenter.y - gridCenter.y) * interp,
            }
            const newScale = scale + (sceneScale - scale) * interp
            if (newScale !== scale) {
                setScale(newScale)
            }
            if (newCenter.x !== gridCenter.x || newCenter.y !== gridCenter.y) {
                // console.log("updating gridCenter:", gridCenter, newCenter)
                setGridCenter(newCenter)
            }
        },
        [ boundingBox, gridWidth, gridHeight, gridCenter, scale ]
    )

    useEffect(
        () => {
            if (!autoCenter) return
            if (stepIdx == 0) {
                // console.log("setDoPanZoom(1): model start, panZoom warp")
                panZoom(1)
                return
            }
            if (runningState == 'none') return
            // console.log(`setDoPanZoom(${autoCenterInterpRate}): autoCenter`)
            panZoom(autoCenterInterpRate)
        },
        [ curStep, stepIdx, runningState, autoCenterInterpRate, autoCenter, ]
    )

    useEffect(
        () => {
            // "Warp" to current scene bounding-box in response to a "virtual" stepIdx change (e.g. mousing over history
            // slider or error plot)
            if (!autoCenter) return
            // console.log("setDoPanZoom(1): vStepIdx warp", vStepIdx)
            panZoom(1)
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
                    const label = containerIdxs.map(idx => sets[idx].name).join('')
                    const area = totalRegionAreas && totalRegionAreas[key] || 0
                    const target = targets.all.get(key) || 0
                    const tooltip = `${label}: ${(area / curStep.total_area.v * curStep.targets.total_area).toPrecision(3)} ${target.toPrecision(3)}`
                    // console.log("key:", key, "hoveredRegion:", hoveredRegion)
                    return (
                        <OverlayTrigger key={`${regionIdx}-${key}`} show={key == hoveredRegion} overlay={<Tooltip
                            onMouseOver={() => setHoveredRegion(key)}>{tooltip}</Tooltip>}>
                            <text
                                transform={`translate(${center.x}, ${center.y}) scale(1, -1)`}
                                textAnchor={"middle"}
                                dominantBaseline={"middle"}
                                fontSize={16 / scale}
                                // Need non-empty text content in order for tooltips to appear correctly positioned in
                                // Firefox (otherwise they end up off the screen somewhere).
                                // TODO: file issue: https://github.com/react-bootstrap/react-bootstrap/issues
                                opacity={0}
                            >{label}</text>
                        </OverlayTrigger>
                    )
                })
            }</g>,
        [ curStep, scale, hoveredRegion, totalRegionAreas, ],
    )

    const regionPaths = useMemo(
        () =>
            curStep && <g id={"regionPaths"}>{
                curStep.regions.map(({ key, segments}, regionIdx) => {
                    let d = ''
                    segments.forEach(({edge, fwd}, idx) => {
                        const { set: { shape }, node0, node1, theta0, theta1, } = edge
                        const [rx, ry] = getRadii(shape)
                        const theta = shape.kind === 'XYRRT' ? shape.t : 0
                        const degrees = theta * 180 / PI
                        const [startNode, endNode] = fwd ? [node0, node1] : [node1, node0]
                        const start = {x: startNode.x.v, y: startNode.y.v}
                        const end = {x: endNode.x.v, y: endNode.y.v}
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

    const setTargetsLink = useCallback(
        (v: Targets) => {
            setTargets(v)
            setInitialShapes(initialLayout.map(s => toShape(s)))
        },
        [ setTargets, setInitialShapes, initialLayout, ]
    )
    const [ clearExampleTooltip, exampleLinks ] = Links({
        links: exampleTargets,
        cur: targets,
        setVal: setTargetsLink,
        activeVisited: true,
    })
    const setLayoutLink = useCallback(
        (v: InitialLayout) => {
            setInitialLayout(v)
            setInitialShapes(v.map(s => toShape(s)))
        },
        [ setInitialLayout, setInitialShapes, ]
    )
    const [ clearLayoutTooltip, layoutLinks ] = Links({
        links: layouts,
        cur: initialLayout,
        setVal: setLayoutLink,
        activeVisited: true,
    })

    useEffect(
        () => {
            if (!shapes) return
            if (!stateInUrlFragment) {
                // console.log("clearing UrlFragmentShapes")
                setUrlFragmentShapes(null)
                setUrlFragmentTargets(null)
                return
            }
            // console.log("setting UrlFragmentShapes:", shapes, "current hash:", window.location.hash)
            setUrlFragmentShapes({ shapes, precisionSchemeId: urlShapesPrecisionScheme })
            setUrlFragmentTargets(rawTargets)
        },
        [ shapes, rawTargets, stateInUrlFragment, urlShapesPrecisionScheme, ]
    )

    useEffect(
        () => {
            const bodyClickHandler = () => {
                console.log("body click")
                clearExampleTooltip()
                clearLayoutTooltip()
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
                    className={css.grid}
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
                                <PlaybackControl title={"Animate forward"} hotkey={"␣"} onClick={() => setRunningState(runningState == "fwd" ? "none" : "fwd")} disabled={cantAdvance} animating={true}>{runningState == "fwd" ? "⏸️" : "⏩"}</PlaybackControl>
                                <PlaybackControl title={"Jump to last computed step"} hotkey={"⌘→"} onClick={() => {
                                    if (!model) return
                                    setStepIdx(model.steps.length - 1)
                                    // console.log("setDoPanZoom(1): warp to end")
                                    panZoom(1)
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
                                <OverlayTrigger overlay={<Tooltip>Copy current layout to clipboard</Tooltip>}>
                                    <span className={css.link} onClick={e => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!shapes) return
                                        // Synchronously update window.location.hash
                                        updateHashParams(params, { s: shapes, t: rawTargets })
                                        console.log("Copying:", window.location.href)
                                        navigator.clipboard.writeText(window.location.href)
                                        setUrlFragmentShapes({shapes, precisionSchemeId: urlShapesPrecisionScheme})
                                        setUrlFragmentTargets(rawTargets)
                                        // console.log("setting UrlFragmentShapes:", shapes, "current hash:", window.location.hash)
                                    }}>🔗</span>
                                </OverlayTrigger>
                                <OverlayTrigger overlay={<Tooltip>Click to {settingsShown ? "hide" : "show"} settings</Tooltip>}>
                                    <span className={css.settingsIcon}>⚙️</span>
                                </OverlayTrigger>
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
                            <Select
                                label={"URL shapes precision"}
                                tooltip={"Number of bits of precision to use for each shape's coordinates in URL: <mantissa>e<exponent>"}
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
                                    initialShapes={initialSets}
                                    targets={rawTargets}
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
                        <DetailsSection
                            title={"Shapes"}
                            open={shapesShown}
                            toggle={setShapesShown}
                            tooltip={"\"Wide\" version of the \"Vars\" table above. View shapes' dimensions/coordinates, copy to clipboard"}
                        >
                            {vars && <ShapesTable sets={sets || []} vars={vars}/>}
                            <div>
                                Copy as{' '}
                                <CopyLayout label={"JS"} shapesTextFn={() => shapesStr(shapeStrJS)} />,{' '}
                                <CopyLayout label={"Rust"} shapesTextFn={() => shapesStr(shapeStrRust)} />,{' '}
                                <CopyLayout label={"JSON"} shapesTextFn={() => shapesStr(shapeStrJSON)} />,{' '}
                                <CopyLayout label={"URL"} shapesTextFn={() => {
                                    if (!shapes || !targets) return undefined
                                    const hash = updatedHash(
                                        params, {
                                            s: { shapes, precisionSchemeId: urlShapesPrecisionScheme },
                                            t: targets,
                                        }
                                    )
                                    return `${window.location.origin}${window.location.pathname}${hash}`
                                }} wrap={true} />
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
                    </div>
                </div>
                <hr />
                <div className={`row`}>
                    <div className={col12}>
                        <h2><span style={{fontWeight: "bold"}}>∧</span>p<span style={{fontWeight: "bold"}}>∨</span>d</h2>
                        <p>Area-Proportional Venn-Diagrams</p>
                        <p>Given "target" values (desired sizes for up to 4 sets, and all possible subsets):</p>
                        <ul>
                            <li>Model each set with an ellipse</li>
                            <li>Compute intersections and areas (using "<A href={"https://en.wikipedia.org/wiki/Dual_number"}>dual numbers</A>" to preserve derivatives)</li>
                            <li>Gradient-descend shapes' coordinates (against overall error) until areas match targets</li>
                        </ul>
                        <h4>See also</h4>
                        <ul>
                            <li><A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>: differentiable shape-intersections in Rust (compiled to WASM for use here)</li>
                            <li><A href={"https://github.com/runsascoded/apvd"}>runsascoded/apvd</A>: this app</li>
                            <li><A href={"/ellipses"}>Ellipse-intersection demo</A> (earlier version, draggable but non-differentiable)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
