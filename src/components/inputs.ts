import {MouseEvent} from "react";
import {round} from "../lib/math";

export const getSliderValue = (e: MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement
    const [ m , M ] = [
        parseInt(target.getAttribute('min') || '0', 10),
        parseInt(target.getAttribute('max') || '0', 10),
    ]
    return round(m + (M - m) * e.nativeEvent.offsetX / target.clientWidth)
}
