import ReactScrollWheelHandler from "react-scroll-wheel-handler";
import Grid, {GridState} from "../src/components/grid"
import React, {Dispatch, Fragment, ReactNode, useCallback, useEffect, useMemo, useState} from "react"
import * as apvd from "apvd"
import {Diagram, Shape, train} from "apvd"
import {makeModel, Model, Step} from "../src/lib/regions"
import css from "./circles.module.scss"
import A from "next-utils/a"
import dynamic from "next/dynamic"
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import {fromEntries} from "next-utils/objs";
import {getSliderValue} from "../src/components/inputs";
import {deg, max, min, degStr, PI, round, sq3, sqrt} from "../src/lib/math";
import Apvd, {LogLevel} from "../src/components/apvd";
import {getMidpoint, getRegionCenter} from "../src/lib/region";
import {BoundingBox, getCenter, getIdx, getRadii, mapShape, S, shapeBox, shapeType} from "../src/lib/shape";
import {Target, TargetsTable} from "../src/components/tables/targets";
import {InitialLayout, toShape} from "../src/lib/layout";
import {VarsTable} from "../src/components/tables/vars";
import {SparkLineProps} from "../src/components/spark-lines";
import {CircleCoord, CircleCoords, CircleFloatGetters, Coord, VarCoord, Vars, XYRRCoord, XYRRCoords, XYRRFloatGetters} from "../src/lib/vars";
import {ShapesTable} from "../src/components/tables/shapes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export const colors = [
    '#f99',  // red
    'green',
    'orange',
    '#99f',  // blue
]

const SymmetricCircles: InitialLayout = [
    { c: { x:   0, y:     0, }, r: 1, },
    { c: { x:   1, y:     0, }, r: 1, },
    { c: { x: 1/2, y: sq3/2, }, r: 1, },
]
const OriginRightUp: InitialLayout = [
    { c: { x:   0, y: 0, }, r: 1, },
    { c: { x:   1, y: 0, }, r: 1, },
    { c: { x:   0, y: 1, }, r: 1, },
    // { c: { x:   0, y: 1, }, r: { x: 2, y: 1, }, },
]

const CircleEllipses: InitialLayout = [
    { c: { x: 0, y: 0, }, r: 1, },
    { c: { x: 1, y: 0, }, r: { x: 1, y: 1, }, },
    { c: { x: 0, y: 1, }, r: { x: 1, y: 1, }, },
]

const r = 2
const r2 = r * r
const r2sq = sqrt(1 + r2)
let c0 = 1/r2sq
let c1 = r2 * c0
export const Ellipses4: InitialLayout = [
    { c: { x:   c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x: 1+c0, y:   c1, }, r: { x: 1, y: r, }, },
    { c: { x:   c1, y:   c0, }, r: { x: r, y: 1, }, },
    { c: { x:   c1, y: 1+c0, }, r: { x: r, y: 1, }, },
]

export const Repro: InitialLayout = [
    { c: { x: -1.100285308561806, y: -1.1500279763995946e-5 }, r: { x: 1.000263820108834, y: 1.0000709021402923 } },
    { c: { x: 0, y: 0, }, r: 1, },
]

const ThreeEqualCircles: Target[] = [
    { sets: "0**", value: PI },
    { sets: "*1*", value: PI },
    { sets: "**2", value: PI },
    { sets: "01*", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "0*2", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "*12", value: 2*PI/3 - sqrt(3)/2 },
    { sets: "012", value: PI/2 - sqrt(3)/2 },
]

const FizzBuzz: Target[] = [
    { sets: "0*", value: 1/3 },
    { sets: "*1", value: 1/5 },
    { sets: "01", value: 1/15 },
]

const FizzBuzzBazz: Target[] = [ // Fractions scaled up by LCM
    { sets: "0**", value: 35 },  // 1 / 3
    { sets: "*1*", value: 21 },  // 1 / 5
    { sets: "**2", value: 15 },  // 1 / 7
    { sets: "01*", value:  7 },  // 1 / 15
    { sets: "0*2", value:  5 },  // 1 / 21
    { sets: "*12", value:  3 },  // 1 / 35
    { sets: "012", value:  1 },  // 1 / 105
]

// Cenomic variants identified by 4 variant callers: VarScan, SomaticSniper, Strelka, JSM2
// cf. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf, ../4-ellipses.png
const VariantCallers: Target[] = [
    { sets: "0---", value: 633 },
    { sets: "-1--", value: 618 },
    { sets: "--2-", value: 187 },
    { sets: "---3", value: 319 },
    { sets: "01--", value: 112 },
    { sets: "0-2-", value:   0 },
    { sets: "0--3", value:  13 },
    { sets: "-12-", value:  14 },
    { sets: "-1-3", value:  55 },
    { sets: "--23", value:  21 },
    { sets: "012-", value:   1 },
    { sets: "01-3", value:  17 },
    { sets: "0-23", value:   0 },
    { sets: "-123", value:   9 },
    { sets: "0123", value:  36 },
]

export type RunningState = "none" | "fwd" | "rev"

export default function Page() {
    const [ logLevel, setLogLevel ] = useState<LogLevel>("info")
    return <Apvd logLevel={logLevel}>{() => <Body logLevel={logLevel} setLogLevel={setLogLevel} />}</Apvd>
}

export function Body({ logLevel, setLogLevel, }: { logLevel: LogLevel, setLogLevel: Dispatch<LogLevel>, }) {
    const [ initialLayout, setInitialLayout] = useState<InitialLayout>(
        Ellipses4
        // Repro,
        // CircleEllipses
        // OriginRightUp,
        // SymmetricCircles,
    )
    const [ targets, setTargets ] = useState<Target[]>(
        // ThreeEqualCircles,
        // FizzBuzz,
        FizzBuzzBazz,
        // VariantCallers,
    )

    const gridState = GridState({
        center: { x: 1, y: 1, },
        scale: 100,
        width: 800,
        height: 600,
        // showGrid: true,
    })
    const {
        scale: [ scale, setScale ],
        center: [ gridCenter, setGridCenter ],
        width: [ gridWidth ],
        height: [ gridHeight ],
        showGrid: [ showGrid, setShowGrid ],
    } = gridState

    const numShapes = useMemo(() => targets[0].sets.length, [ targets ])
    const wasmTargets = useMemo(
        () => targets.map(({ sets, value }) => [ sets, value ]),
        [ targets ],
    )
    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useState(0.5)
    const [ maxSteps, setMaxSteps ] = useState(10000)
    const [ stepBatchSize, setStepBatchSize ] = useState(50)

    const [ model, setModel ] = useState<Model | null>(null)
    const [ modelStepIdx, setModelStepIdx ] = useState<number | null>(null)
    const [ vStepIdx, setVStepIdx ] = useState<number | null>(null)
    const [ runningState, setRunningState ] = useState<RunningState>("none")
    const [ frameLen, setFrameLen ] = useState(0)

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

    const curStep: Step | null = useMemo(
        () => (!model || stepIdx === null) ? null : model.steps[stepIdx],
        [ model, stepIdx ],
    )

    const boundingBox = useMemo(
        () =>
            curStep && curStep.inputs.reduce<BoundingBox<number> | null>(
                (cur, [shape]) => {
                    const box = shapeBox(shape)
                    if (!cur) return box
                    return [{
                        x: min(cur[0].x, box[0].x),
                        y: min(cur[0].y, box[0].y),
                    }, {
                        x: max(cur[1].x, box[1].x),
                        y: max(cur[1].y, box[1].y),
                    }]
                },
                null
            ),
        [ curStep, ]
    )

    useEffect(
        () => {
            if (!boundingBox || runningState == 'none') return
            const [ lo, hi ] = boundingBox
            const sceneCenter = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, }
            const width = hi.x - lo.x
            const height = hi.y - lo.y
            const sceneScale = min(gridWidth / width, gridHeight / height) * 0.9
            const interp = 0.05
            const newCenter = {
                x: gridCenter.x + (sceneCenter.x - gridCenter.x) * interp,
                y: gridCenter.y + (sceneCenter.y - gridCenter.y) * interp,
            }
            const newScale = scale + (sceneScale - scale) * interp
            setScale(newScale)
            setGridCenter(newCenter)
        },
        [ curStep, runningState, boundingBox, ]
    )

    const initialShapes: S[] = useMemo(
        () =>
            initialLayout
                .slice(0, numShapes)
                .map((s, idx) => {
                    const shape = toShape(s, idx)
                    return {
                        idx,
                        name: String.fromCharCode('A'.charCodeAt(0) + idx),
                        color: colors[idx],
                        ...shape,
                    }
                }),
        [ numShapes, initialLayout, ]
    )

    const shapes: S[] = useMemo(
        () =>
            curStep
                ? curStep
                    .regions
                    .shapes
                    .map((c: Shape<number>, idx: number) => (
                        { ...initialShapes[idx], ...c, }
                    ))
                : initialShapes.slice(0, numShapes),
        [ curStep, initialShapes, numShapes ],
    )

    const vars: Vars = useMemo(
        () => {
            const allCoords: Coord[][] = initialShapes.map(s => 'Circle' in s ? CircleCoords : XYRRCoords)
            const numCoords = ([] as string[]).concat(...allCoords).length
            const skipVars: Coord[][] = [
                // Fix all coords of shapes[0], it is the unit circle centered at the origin, WLOG
                // CircleCoords,
                // XYRRCoords,
                // Fix shapes[1].y. This can be done WLOG if it's a Circle. Having the second shape be an XYRR (aligned
                // ellipse, no rotation) is effectively equivalent to it being an XYRRT (ellipse with rotation allowed),
                // but where the rotation has been factored out WLOG.
                // ['y'],
            ]
            const numSkipVars = ([] as string[]).concat(...skipVars).length
            const numVars = numCoords - numSkipVars
            const vars = allCoords.map(
                (circleVars, idx) =>
                    circleVars.filter(v =>
                        !(skipVars[idx] || []).includes(v)
                    )
            )
            const coords: VarCoord[] = []
            vars.forEach((shapeVars, shapeIdx) => {
                shapeVars.forEach(shapeVar => {
                    coords.push([ shapeIdx, shapeVar ])
                })
            })
            function getVal(step: Step, varIdx: number): number {
                const [ shapeIdx, coord ] = coords[varIdx]
                const shape = step.regions.shapes[shapeIdx]
                if ('Circle' in shape) {
                    const c = shape.Circle
                    const getter = CircleFloatGetters[coord as CircleCoord]
                    return getter(c)
                } else {
                    const e = shape.XYRR
                    const getter = XYRRFloatGetters[coord as XYRRCoord]
                    return getter(e)
                }
            }
            return {
                allCoords,
                numCoords,
                skipVars,
                numSkipVars,
                vars,
                numVars,
                coords,
                getVal,
            }
        },
        [ initialShapes, ],
    )

    // Initialize model, stepIdx
    useEffect(
        () => {
            // Naively, n circles have 3n degrees of freedom. However, WLOG, we can fix:
            // - c0 to be a unit circle at origin (x = y = 0, r = 1)
            // - c1.y = 0 (only x and r can move)
            // resulting in 4 fewer free variables.
            let curIdx = 0
            const { numVars, skipVars } = vars
            const inputs = initialShapes.map((shape: Shape<number>, shapeIdx: number) => {
                const coords: Coord[] = 'Circle' in shape ? CircleCoords : XYRRCoords
                return [
                    'Circle' in shape ? { Circle: shape.Circle } : { XYRR: shape.XYRR },
                    coords.map(v => {
                        const row = new Array(numVars).fill(0)
                        const skip = shapeIdx < skipVars.length && skipVars[shapeIdx].includes(v)
                        if (!skip) {
                            row[curIdx] = 1
                            curIdx += 1
                        }
                        return row
                    }),
                ]
            })
            console.log("inputs:", inputs)
            const model = makeModel(apvd.make_model(inputs, wasmTargets))
            console.log("new model:", model)
            setModel(model)
            setStepIdx(0)
        },
        [ vars, initialShapes, wasmTargets, ]
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
                console.log("bumping stepIdx to", stepIdx + n)
                return
            }
            if (model.repeat_idx) {
                // Don't advance past repeat_idx
                setStepIdx(model.steps.length - 1)
                console.log(`bumping stepIdx to ${model.steps.length - 1} due to repeat_idx ${model.repeat_idx}`)
                return
            }
            if (stepIdx + n > maxSteps) {
                n = maxSteps - stepIdx
                batchSize = n
                console.log(`Clamping advance to ${n} steps due to maxSteps ${maxSteps}`)
            }

            const lastDiagram: Diagram = model.lastDiagram
            const batchSeed: apvd.Model = {
                steps: [ lastDiagram ],
                repeat_idx: null,
                min_idx: 0,
                min_error: lastDiagram.error.v,
            }
            const batch = makeModel(train(batchSeed, maxErrorRatioStepSize, batchSize))
            const batchMinStep = batch.steps[batch.min_idx]
            const modelMinStep = model.steps[model.min_idx]
            const steps = model.steps.concat(batch.steps.slice(1))
            const [ min_idx, min_error ] = (batchMinStep.error.v < modelMinStep.error.v) ?
                [ batch.min_idx + model.steps.length - 1, batchMinStep.error.v ] :
                [ model.min_idx, model.min_error ]
            const newModel: Model = {
                steps,
                repeat_idx: batch.repeat_idx ? batch.repeat_idx + model.steps.length - 1 : null,
                min_idx,
                min_error,
                lastDiagram: batch.lastDiagram,
            }
            console.log("newModel:", newModel)
            setModel(newModel)
            setStepIdx(newModel.steps.length - 1)
        },
        [ model, stepIdx, stepBatchSize, maxErrorRatioStepSize, maxSteps, ]
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
    }, [ fwdStep, revStep, cantAdvance, cantReverse, setRunningState, runningState, ]);

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

            console.log(`scheduling ${runningState} step ${stepIdx}`)
            const timer = setTimeout(
                () => {
                    if (runningState == expectedDirection) {
                        console.log(`running ${expectedDirection} step from ${stepIdx}`)
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
    // console.log("errors:", errors)
    // console.log(`render: ${model?.steps?.length} steps, idx ${stepIdx}`)

    // const basePath = getBasePath();

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
                            // x: steps.map((_: Diagram, idx: number) => xlo + idx),
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

    const [ sparkLineLimit, setSparkLineLimit ] = useState(20)
    const [ sparkLineStrokeWidth, setSparkLineStrokeWidth ] = useState(1)
    const [ sparkLineMargin, setSparkLineMargin ] = useState(1)
    const [ sparkLineWidth, setSparkLineWidth ] = useState(80)
    const [ sparkLineHeight, setSparkLineHeight ] = useState(30)
    const sparkLineProps: SparkLineProps = { sparkLineLimit, sparkLineStrokeWidth, sparkLineMargin, sparkLineWidth, sparkLineHeight, }
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
                        onClick={() => {
                            onClick()
                            if (!animating) {
                                setRunningState("none")
                            }
                        }}
                        disabled={disabled}>
                        {children}
                    </Button>
                </span>
            </OverlayTrigger>
        },
        [],
    )

    const fs = [ 0.25, 0.5, 0.75, ];
    // const fs = [ 0.5, ];

    const circleNodes = useMemo(
        () => <g id={"shapes"}>{
            shapes.map(({ color, ...shape }: S, idx: number) => {
                const { x: cx, y: cy } = getCenter(shape)
                const props = {
                    key: idx,
                    cx, cy,
                    stroke: "black",
                    strokeWidth: 3 / scale,
                    fill: color,
                    fillOpacity: 0.3,
                }
                return 'Circle' in shape
                    ? <circle
                        r={shape.Circle.r}
                        {...props}
                    />
                    : <ellipse
                        rx={shape.XYRR.r.x}
                        ry={shape.XYRR.r.y}
                        {...props}
                    />
            })
        }</g>,
        [ shapes, scale ],
    )

    const [ showIntersectionPoints, setShowIntersectionPoints ] = useState(false)
    const intersectionNodes = useMemo(
        () => showIntersectionPoints && <g id={"intersections"}>{
            curStep && curStep.regions.points.map(({ x, y, c0, c1, t0, t1 }, pointIdx) => {
                return (
                    <OverlayTrigger
                        key={pointIdx}
                        overlay={
                            <Tooltip>
                                <div>x: {x.v.toPrecision(4)}</div>
                                <div>y: {y.v.toPrecision(4)}</div>
                                <div>{getIdx(c0)}@{degStr(t0.v)}</div>
                                <div>{getIdx(c1)}@{degStr(t1.v)}</div>
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
            })
        }</g>,
        [ showIntersectionPoints, curStep, scale, ],
    )

    const [ showEdgePoints, setShowEdgePoints ] = useState(false)
    const edgePoints = useMemo(
        () =>
            showEdgePoints && curStep && curStep.regions.edges.map((edge, edgeIdx) =>
                fs.map(f => {
                    const midpoint = getMidpoint(edge, f)
                    const { shape } = edge
                    console.log(`edge: ${getIdx(shape)}, ${round(deg(edge.t0))}, ${round(deg(edge.t1))}, midpoint: ${midpoint}`)
                    return <circle
                        key={`${edgeIdx} ${f}`}
                        cx={midpoint.x}
                        cy={midpoint.y}
                        r={0.1}
                        stroke={"red"}
                        strokeWidth={1 / scale}
                        fill={"red"}
                        fillOpacity={0.5}
                    />
                })
            ),
        [ showEdgePoints, curStep, scale, ]
    )

    const expandedTargets = useMemo(
        () => apvd.expand_areas(wasmTargets) as [ string, number ][],
        [ wasmTargets, ]
    )

    const expandedTargetsMap = useMemo(
        () => expandedTargets ? fromEntries(expandedTargets) : null,
        [ expandedTargets ],
    )

    const [ hoveredRegion, setHoveredRegion ] = useState<string | null>(null)

    const [ showRegionLabels, setShowRegionLabels ] = useState(true)
    const regionLabels = useMemo(
        () =>
            curStep && <g id={"regionLabels"}>{
                curStep.regions.regions.map((region, regionIdx) => {
                    const center = getRegionCenter(region, fs)
                    const containerIdxs = region.containers.map(getIdx)
                    containerIdxs.sort()
                    const label = containerIdxs.map(idx => shapes[idx].name).join('')
                    const { key, area } = region
                    const target = expandedTargetsMap && expandedTargetsMap[key]
                    const tooltip = target ? `${label}: ${(area.v / curStep.total_area.v * curStep.total_target_area).toPrecision(3)} ${target.toPrecision(3)}` : key
                    // console.log("key:", key, "hoveredRegion:", hoveredRegion)
                    return (
                        <OverlayTrigger key={`${regionIdx}-${key}`} show={key == hoveredRegion} overlay={<Tooltip onMouseOver={() => setHoveredRegion(key)}>{tooltip}</Tooltip>}>
                            <text
                                transform={`translate(${center.x}, ${center.y}) scale(1, -1)`}
                                textAnchor={"middle"}
                                dominantBaseline={"middle"}
                                fontSize={16 / scale}
                            >{
                                showRegionLabels && label
                            }</text>
                        </OverlayTrigger>
                    )
                })
            }</g>,
        [ curStep, scale, showRegionLabels, hoveredRegion, ],
    )

    // console.log("expandedTargets:", expandedTargets)

    const regionPaths = useMemo(
        () =>
            curStep && <g id={"regionPaths"}>{
                curStep.regions.regions.map(({ key, segments, area, containers }, regionIdx) => {
                    let d = ''
                    segments.forEach(({ edge, fwd }, idx) => {
                        const { shape, i0, i1, t0, t1, } = edge
                        const [ rx, ry ] = getRadii(shape)
                        const [ start, end ] = fwd ? [ i0, i1 ] : [ i1, i0 ]
                        if (idx == 0) {
                            d = `M ${start.x.v} ${start.y.v}`
                        }
                        d += ` A ${rx},${ry} 0 ${t1 - t0 > PI ? 1 : 0} ${fwd ? 1 : 0} ${end.x.v},${end.y.v}`
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

    const fizzBuzzLink = <A href={"https://en.wikipedia.org/wiki/Fizz_buzz"}>Fizz Buzz</A>
    const exampleTargets = [
        { name: "Fizz Buzz", targets: FizzBuzz, description: <>2 circles, of size 1/3 and 1/5, representing integers divisible by 3 and by 5. Inspired by {fizzBuzzLink}.</> },
        { name: "Fizz Buzz Bazz", targets: FizzBuzzBazz, description: <>Extended version of {fizzBuzzLink} above, with 3 sets, representing integers divisible by 3, 5, or 7. This is impossible to model accurately with 3 circles, but gradient descent gets as close as it can.</> },
        { name: "3 symmetric sets", targets: ThreeEqualCircles, description: <>Simple test case, 3 circles, one starts slightly off-center from the other two, "target" ratios require the 3 circles to be in perfectly symmetric position with each other.</> },
        { name: "Variant callers", targets: VariantCallers, description: <>Values from <A href={"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf"}>Roberts et al (2013)</A>, "A comparative analysis of algorithms for somatic SNV detection
                in cancer," Fig. 3</>}
    ]

    const shapeText = useMemo(
        () => curStep && curStep.inputs.map(([ shape ]) =>
            mapShape(
                shape,
                ({ idx, c: { x, y }, r }) => `Circle { idx: ${idx}, c: { x: ${x}, y: ${y} }, r: ${r} }`,
                ({ idx, c: { x, y}, r: { x: rx, y: ry } }) => `XYRR { idx: ${idx}, c: { x: ${x}, y: ${y} }, r: { x: ${rx}, y: ${ry} } }`,
            )
        ).join(",\n"),
        [ curStep],
    )

    const centerDot =
        <circle
            cx={gridCenter.x}
            cy={gridCenter.y}
            r={0.05}
            stroke={"black"}
            strokeWidth={1 / scale}
            fill={"black"}
            fillOpacity={0.8}
        />

    return (
        <div className={css.body}>
            <div className={`${css.row} ${css.content}`}>
                <Grid
                    className={css.svg}
                    state={gridState}
                >
                    <>
                        {circleNodes}
                        {edgePoints}
                        {regionLabels}
                        {regionPaths}
                        {intersectionNodes}
                        {/*{centerDot}*/}
                    </>
                </Grid>
                <hr />
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
                                <PlaybackControl title={"Reset to beginning"} hotkey={"⌘←"} onClick={() => setStepIdx(0)} disabled={cantReverse}>⏮️</PlaybackControl>
                                <PlaybackControl title={"Rewind"} hotkey={"⇧␣"} onClick={() => setRunningState(runningState == "rev" ? "none" : "rev")} disabled={cantReverse} animating={true}>{runningState == "rev" ? "⏸️" : "⏪️"}</PlaybackControl>
                                <PlaybackControl title={"Reverse one step"} hotkey={"←"} onClick={() => revStep()} disabled={cantReverse}>⬅️</PlaybackControl>
                                <PlaybackControl title={"Advance one step"} hotkey={"→"} onClick={() => fwdStep()} disabled={cantAdvance || stepIdx == maxSteps}>➡️</PlaybackControl>
                                <PlaybackControl title={"Fast-forward"} hotkey={"␣"} onClick={() => setRunningState(runningState == "fwd" ? "none" : "fwd")} disabled={cantAdvance} animating={true}>{runningState == "fwd" ? "⏸️" : "⏩"}</PlaybackControl>
                                <PlaybackControl title={"Seek to last computed step"} hotkey={"⌘→"} onClick={() => model && setStepIdx(model.steps.length - 1)} disabled={!model || stepIdx === null || stepIdx + 1 == model.steps.length}>⏭️</PlaybackControl>
                            </div>
                            <div className={css.stepStats}>
                                <p>Step {stepIdx}{ curStep && error && <span>, error: {(error.v * curStep.total_target_area).toPrecision(3)}</span> }</p>
                                <p
                                    onMouseMove={() => {
                                        if (!model) return
                                        // console.log("mousemove set to min_idx", model.min_idx)
                                        setVStepIdx(model.min_idx)
                                        setRunningState("none")
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
                                    model && curStep && bestStep && <>
                                        Best step: {model.min_idx}, error: {(bestStep.error.v * curStep.total_target_area).toPrecision(3)} ({(bestStep.error.v * 100).toPrecision(3)}%)
                                    </>
                                }</p>
                                {repeatSteps && stepIdx == repeatSteps[1] ?
                                    <p className={css.repeatSteps}>♻️ Step {repeatSteps[1]} repeats step {repeatSteps[0]}</p> :
                                    <p className={`${css.repeatSteps} ${css.invisible}`}>♻️ Step {"?"} repeats step {"?"}</p>
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`${col6} ${css.controlPanel}`}>
                        <div className={css.input}>
                            <label>
                                Max error ratio step size:
                                <input
                                    type={"number"}
                                    min={0} max={1.2} step={0.1}
                                    value={maxErrorRatioStepSize}
                                    onChange={(e) => setMaxErrorRatioStepSize(parseFloat(e.target.value))}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Max steps:
                                <input
                                    type={"number"}
                                    value={maxSteps}
                                    onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Step batch size:
                                <input
                                    type={"number"}
                                    value={stepBatchSize}
                                    onChange={(e) => setStepBatchSize(parseInt(e.target.value))}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Region labels:
                                <input
                                    type={"checkbox"}
                                    checked={showRegionLabels}
                                    onChange={e => setShowRegionLabels(e.target.checked)}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Intersections:
                                <input
                                    type={"checkbox"}
                                    checked={showIntersectionPoints}
                                    onChange={e => setShowIntersectionPoints(e.target.checked)}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Grid:
                                <input
                                    type={"checkbox"}
                                    checked={showGrid}
                                    onChange={e => setShowGrid(e.target.checked)}
                                    onKeyDown={e => { e.stopPropagation() }}
                                />
                            </label>
                        </div>
                        <div className={css.input}>
                            <label>
                                Log level:
                                <select
                                    value={logLevel}
                                    onChange={e => setLogLevel(e.target.value as LogLevel)}
                                    onKeyDown={e => { e.stopPropagation() }}
                                >{
                                    ["debug", "info", "warn"].map(level =>
                                        <option key={level} value={level}>{level}</option>
                                    )
                                }</select>
                            </label>
                        </div>
                    </div>
                </div>
                <hr />
                <div className={"row"}>
                    <div className={`${col7}`}>
                        <h3 className={css.tableTitle}>Targets</h3>
                        {
                            model && curStep && error && sparkLineCellProps &&
                            <TargetsTable
                                initialShapes={initialShapes}
                                targets={targets}
                                curStep={curStep}
                                error={error}
                                {...sparkLineCellProps}
                            />
                        }
                        <div>
                            <details>
                                <summary>Examples</summary>
                                <ul style={{ listStyle: "none", }}>{
                                    exampleTargets.map(({ name, targets, description }, idx) => {
                                        const overlay = <Tooltip>{description}</Tooltip>
                                        return (
                                            <li key={idx}>
                                                <OverlayTrigger overlay={overlay}>
                                                    <a href={"#"} onClick={() => { setTargets(targets) }}>{name}</a>
                                                </OverlayTrigger>
                                                {' '}
                                                <OverlayTrigger trigger="click" placement="right" overlay={overlay}>
                                                    <span className={css.info}>ℹ️</span>
                                                </OverlayTrigger>
                                            </li>
                                        )
                                    })
                                }</ul>
                            </details>
                        </div>
                        <div
                            onMouseOut={e => {
                                // console.log("onMouseOut:", e)
                                setVStepIdx(null)
                            }}
                        >
                            <h3 className={css.tableTitle}>Error</h3>
                            {plot}
                        </div>
                    </div>
                    <div className={col5}>
                        <h3 className={css.tableTitle}>Vars</h3>
                        {
                            curStep && error && sparkLineCellProps &&
                            <VarsTable
                                vars={vars}
                                initialShapes={initialShapes}
                                shapes={shapes}
                                curStep={curStep}
                                error={error}
                                {...sparkLineCellProps}
                            />
                        }
                        <div className={css.tableBreak} />
                        <h3 className={css.tableTitle}>Shapes</h3>
                        <ShapesTable shapes={shapes} vars={vars} />
                        <div className={css.shapesPreContainer} onClick={() => {
                            shapeText && navigator.clipboard.writeText(shapeText)
                        }}>
                            <OverlayTrigger overlay={<Tooltip>Click to copy</Tooltip>}>
                                <pre>{shapeText}</pre>
                            </OverlayTrigger>
                        </div>
                    </div>
                </div>
                <hr />
                <div className={`row`}>
                    <div className={col12}>
                        <h3>Differentiable shape-intersection</h3>
                        <p>Given "target" values:</p>
                        <ul>
                            <li>Model each set with an ellipse</li>
                            <li>Compute intersections and areas (using "<A href={"https://en.wikipedia.org/wiki/Dual_number"}>dual numbers</A>" to preserve "forward-mode" derivatives)</li>
                            <li>Gradient-descend until areas match targets</li>
                        </ul>
                        <h4>See also</h4>
                        <ul>
                            <li><A href={"https://github.com/runsascoded/shapes"}>runsascoded/shapes</A>: Rust implementation of differentiable shape-intersection</li>
                            <li><A href={"https://github.com/runsascoded/apvd"}>runsascoded/apvd</A>: this app</li>
                            <li><A href={"/ellipses"}>Ellipse-intersection demo</A> (non-differentiable)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
