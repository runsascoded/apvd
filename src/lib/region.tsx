
import React, { MouseEvent } from 'react';
import Edge from "./edge";
import Intersection from "./intersection";

export type Containers = { [k: string]: boolean }

export type Props = {
    k: string
    polygonArea: number
    secantArea: number
    area: number
    containers: Containers
    i: number
    width: number
    points: Intersection[]
    edges: Edge[]
}

export default function Region({ k, polygonArea, secantArea, area, containers, i, width, points, edges, }: Props) {
    function onMouseEnter() {
        console.log("enter:", k, polygonArea, secantArea, area);
    }

    function onMouseLeave(e: MouseEvent) {
        //console.log("leave:", k, this);
    }

    const n = points.length;
    if (n === 1) {
        const e = edges[0].e;
        return <g
            transform={`translate(${e.cx},${e.cy}) rotate(${e.degrees})`}>
            <ellipse
                rx={e.rx}
                ry={e.ry}
                className={containers ? "clear" : "region"}
                stroke="black"
                strokeWidth={width}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            />
        </g>;
    }

    const d = edges.map((e: Edge, i) => {
        const point = points[i];
        return i ? e.arcpath(point) : e.path(point);
    }).join(" ");

    //console.log("region:", d);
    return <path
        key={i}
        className="region"
        d={d}
        stroke="black"
        strokeWidth={width}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    />;
}
