import { ReactNode } from "react"
import { Point } from "./components/point"
import { LabelAttrs } from "./lib/region"
import { HashMapVal, Param, ParsedParam } from "./lib/params"
import { ShapesParam } from "./lib/shapes-buffer"
import { SetMetadata } from "./lib/shape"
import { Targets } from "./lib/targets"

export type RunningState = "none" | "fwd" | "rev"

export type LabelPoint = Point & LabelAttrs & { setIdx: number, point: Point }

export type ValItem<Val> = { name: string, val: Val, description: ReactNode }
export type LinkItem = { name: string, children: ReactNode, description: ReactNode }

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
