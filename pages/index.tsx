
import React, {useMemo, useState} from 'react';
import Svg from '../src/components/svg';
import ModelTextField from '../src/components/model-text-field';
// import Ellipse from '../src/lib/ellipse';
import Ellipses from '../src/lib/ellipses';
import { lengthCmp, pi, powerset, r3, spaces } from '../src/lib/utils';
import {Point} from '../src/components/point';

const { fromEntries, keys } = Object;

export type Ellipse = {
    name: string
    color: string
    cx: number
    cy: number
    rx: number
    ry: number
    degrees: number
};

export function getInitialProps() {
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
    const [ ellipses, setEllipses ] = useState(initialEllipses.map(e => new Ellipse(e)));
    const [ malformedEllipses, setMalformedEllipses ] = useState(false);
    const [ virtualCursor, setVirtualCursor ] = useState({ x: 0, y: 0 });
    const [ activeSvg, setActiveSvg ] = useState(0);
    const ellipsesObj = useMemo(
        () => fromEntries(ellipses.map((e, i) => [ i, e ] )),
        [ ellipses ]
    )

    function onTextFieldChange(value: string) {
        try {
            const ellipses = JSON.parse(value);
            setEllipses(ellipses)
            setMalformedEllipses(false)
        } catch(err) {
            setMalformedEllipses(true)
        }
    }

    function onEllipseDrag(k: number, change: Partial<Ellipse>) {
        const newEllipseK = { ...ellipses[k], ...change };
        const o = {} as { [k: number]: Ellipse }; o[k] = newEllipseK;
        const newEllipses = { ...ellipses, ...o };
        setEllipses(newEllipses);
    }

    function onCursor(p: Point, svgIdx: number) {
        setVirtualCursor(p);
        setActiveSvg(svgIdx);
    }

    const e = useMemo(() => new Ellipses(ellipses), [ ellipses ])
    const { intersections, regions } = useMemo(() => e, [ e ])
    const areaKeys =
        powerset(keys(ellipses))
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
                    transformBy={ellipses[k]}
                    ellipses={ellipses}
                    points={intersections}
                    cursor={virtualCursor}
                    showGrid={true}
                    gridSize={1}
                    projection={{ x: 0, y: 0, s: 50 }}
                    onCursor={p => onCursor(p, k)}
                    hideCursorDot={activeSvg === k}
                />
        )

    return <div>
        <Svg
            key="main"
            ellipses={ellipses}
            points={intersections}
            cursor={virtualCursor}
            regions={regions}
            onEllipseDrag={onEllipseDrag}
            showGrid={true}
            gridSize={1}
            projection={{ x: 0, y: 0, s: 50 }}
            onCursor={onCursor}
            hideCursorDot={activeSvg === undefined}
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
