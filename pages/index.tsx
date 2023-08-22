import React, {useEffect, useMemo, useState} from 'react';
import Svg from '../src/components/svg';
import ModelTextField from '../src/components/model-text-field';
import EllipseC, {Center, RadiusVector} from '../src/lib/ellipse';
import Ellipses from '../src/lib/ellipses';
import { lengthCmp, pi, powerset, r3, spaces } from '../src/lib/utils';
import {Point} from '../src/components/point';
import apvd, { fit } from "apvd";

export type Ellipse = {
    name: string
    color: string
    cx: number
    cy: number
    rx: number
    ry: number
    degrees: number
};

export function getStaticProps() {
    const ellipses: Ellipse[] = [
        {
            name: "A", color: 'red',
            cx: -0.82, cy: 0.38,
            rx: 1, ry: 2,
            degrees: 0,
        },
        {
            name: "B", color: 'blue',
            cx: -0.7, cy: 0.12,
            rx: 1.3, ry: 0.4,
            degrees: 114,
        },
        {
            name: "C", color: 'darkgoldenrod',
            cx: 0.5, cy: 1.52,
            rx: .94, ry: .48,
            degrees: 18,
        },
        {
            name: "D", color: 'green',
            cx: 0, cy: 0,
            rx: .6, ry: .48,
            degrees: -44,
        }
    ]
    return { props: { ellipses } }
}

export default function Page({ ellipses: initialEllipses }: { ellipses: Ellipse[] }) {
    const [ ellipses, setEllipses ] = useState(initialEllipses.map(e => new EllipseC(e)));
    const [ malformedEllipses, setMalformedEllipses ] = useState(false);
    const [ virtualCursor, setVirtualCursor ] = useState({ x: 0, y: 0 });
    const [ activeSvg, setActiveSvg ] = useState(0);

    // useEffect(() => {
    //     apvd().then(() => {
    //         const model = fit(
    //             [
    //                 {
    //                     idx: 0,
    //                     c: {
    //                         x: { v: 0, d: [ 0, 0 ], },
    //                         y: { v: 0, d: [ 0, 0 ], },
    //                     },
    //                     r: { v: 1, d: [ 0, 0 ], },
    //                 }, {
    //                     idx: 1,
    //                     c: {
    //                         x: { v: 1, d: [ 1, 0 ], },
    //                         y: { v: 0, d: [ 0, 0 ], },
    //                     },
    //                     r: { v: 1, d: [ 0, 1 ], }
    //                 }
    //              ],
    //              [
    //                 [ "0*", 1/3  ],  // Fizz
    //                 [ "*1", 1/5  ],  // Buzz
    //                 [ "01", 1/15 ],  // Fizz Buzz
    //             ],
    //              0.1,
    //              100,
    //         )
    //         console.log("model:", model)
    //         for (let idx in model.steps) {
    //             const step = model.steps[idx];
    //             const c1 = step.duals[1]
    //             const error = step.error
    //             console.log(`Step ${idx}:`, "err", error.v, `[${error.d.join(", ")}]`, `cx`, c1.c.x.v, "r", c1.r.v,)
    //         }
    //     })
    // }, []);

    function onTextFieldChange(value: string) {
        try {
            const ellipses = JSON.parse(value);
            setEllipses(ellipses)
            setMalformedEllipses(false)
        } catch(err) {
            setMalformedEllipses(true)
        }
    }

    function onEllipseDrag(k: number, change: Center | RadiusVector) {
        const newEllipses = [ ...ellipses ];
        newEllipses[k] = ellipses[k].modify(change)
        setEllipses(newEllipses);
    }

    function onCursor(p: Point, svgIdx: number) {
        setVirtualCursor(p);
        setActiveSvg(svgIdx);
    }

    const e = useMemo(() => new Ellipses(ellipses), [ ellipses ])
    const { intersections, regions } = useMemo(() => e, [ e ])
    const areaKeys =
        powerset(Array.from(ellipses.keys()))
            .map((s: number[]) => ({
                key: s.join(","),
                name: s.length ? s.map(k => ellipses[k].name).join("⋂") : "*"
            }))
            .sort(
                ( { key: k1 }: { key: string },  { key: k2 }: { key: string }, ) => lengthCmp(k1, k2)
            );

    const maxKeyLen = Math.max.apply(Math, areaKeys.map(k => k.name.length));

    const areasStr =
        areaKeys.map(
            rs => {
                const area = e.areasObj[rs.key] || 0;
                return rs.name + spaces(maxKeyLen - rs.name.length) + ": " + r3(area / pi);
            })
            .join("\n");

    const projectedSVGs =
        ellipses.map((ellipse, k) =>
                <Svg
                    key={k}
                    idx={k+1}
                    transformBy={ellipses[k]}
                    ellipses={ellipses}
                    points={intersections}
                    cursor={virtualCursor}
                    showGrid={true}
                    gridSize={1}
                    projection={{ x: 0, y: 0, s: 50 }}
                    onCursor={p => onCursor(p, k+1)}
                    hideCursorDot={activeSvg === k+1}
                />
        )

    return <div>
        <Svg
            key="main"
            idx={0}
            ellipses={ellipses}
            points={intersections}
            cursor={virtualCursor}
            regions={regions}
            onEllipseDrag={onEllipseDrag}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={onCursor}
            hideCursorDot={activeSvg === 0}
        />
        {projectedSVGs}
        <textarea
            className="areas"
            onChange={() => {}}
            value={areasStr}
        />
        <ModelTextField
            {...{ellipses, malformedEllipses}}
            onChange={onTextFieldChange}
        />
    </div>;
}
