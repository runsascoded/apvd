export const { abs, atan2, ceil, cos, floor, log, log2, log10, log1p, min, max, PI, round, sin, sqrt, tan } = Math

export const pi = Math.PI
export const r3 = (x: number) => Math.round(1000 * x) / 1000
export const pi2 = pi / 2
export const pi4 = pi / 4
export const tau = 2 * pi

export const sq3 = sqrt(3)

export const clamp = (v: number, m: number, M: number): number => max(m, min(M, v))

export const deg = (t: number) => 180 * t / pi
export const rad = (d: number) => pi * d / 180

export const degStr = (t: number) => r3(deg(t)) + "°"
