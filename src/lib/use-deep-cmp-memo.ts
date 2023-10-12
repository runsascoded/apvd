import { useMemo, useRef } from "react";
import _ from "lodash";

/**
 * Memoize a value using `_.isEqual` for deep-equality comparison.
 * Adapted from https://stackoverflow.com/a/54096391.
 */
export function useDeepCmpMemo<T>(fn: () => T, deps: any[]): T {
    const value = useMemo(fn, [ fn, ...deps ])
    return useDeepCmp(value)
}

export function useDeepCmp<T>(value: T): T {
    const ref = useRef(value);
    if (!_.isEqual(value, ref.current)) {
        ref.current = value;
    }
    return ref.current;
}
