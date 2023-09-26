import {entries, mapEntries, mapValues, values} from "../../../next-utils/dist/objs";
import {Dispatch, useCallback, useEffect, useMemo, useState} from "react";
import {useRouter} from "next/router";
import {getHash, useHash} from "./hash";
import _ from "lodash";


export type Param<T, U = Dispatch<T>> = {
    encode: (t: T) => string | undefined
    decode: (v: string | undefined) => T
    push?: boolean
    use?: (init: T) => [ T, U ]
}

export type ParsedParam<T> = [ T, Dispatch<T> ]

export function stringParam(push: boolean = true): Param<string | undefined> {
    return {
        encode: v => v,
        decode: v => v,
        push,
    }
}

export function defStringParam(init: string, push: boolean = true): Param<string> {
    return {
        encode: v => v == init ? undefined : v,
        decode: v => v == undefined ? init : v,
        push,
    }
}

/**
 * Param for storing URLs specifically; strips off the leading "https://"
 * @param init initial/default value, query param is omitted iff the value matches this
 * @param push whether to push changes into the browser's history/navigation stack
 */
export function urlParam(init: string, push: boolean = true): Param<string> {
    return {
        encode: v => {
            if (v == init) return undefined
            return v.replace(/^https:\/\//, '')
        },
        decode: v => {
            if (v === undefined) return init
            return v.startsWith('http') ? v : `https://${v}`
        },
        push,
    }
}

export function intParam(init: number, push: boolean = true): Param<number> {
    return {
        encode: v => v === init ? undefined : v.toString(),
        decode: v => v ? parseInt(v) : init,
        push,
    }
}

export function getHashMap<Params extends { [k: string]: Param<any, any> }>(params: Params, hash?: string) {
    hash = hash || getHash()
    const hashPieces = hash ? hash.split('&') : [];
    console.log("hashPieces:", hashPieces)
    const hashMap = {} as { [k: string]: any };
    hashPieces.forEach(piece => {
        const [ k, vStr] = piece.split('=', 2);
        const param = params[k]
        const val = param.decode(vStr)
        console.log("decoded:", k, vStr, val)
        hashMap[k] = val;
    })
    console.log("hashMap:", hashMap)
    return hashMap
}

export function parseHashParams<Params extends { [k: string]: Param<any, any> }, ParsedParams>({ params }: { params: Params }): ParsedParams {
    const [ initialHash, setInitialHash ] = useState(getHash());

    const state = mapEntries(
        params,
        (k, param) => {
            const init = param.decode(undefined)
            const [ val, set ] = (param.use || useState)(init)
            console.log(`param-${k} init`, val)
            return [ k, { val, set, param } ]
        }
    )
    const stateVals = values(state).map(({ val }) => val)
    console.log("stateVals:", stateVals)

    const setStates = useCallback(
        (hash?: string) => {
            const hashMap = getHashMap(params, hash)
            entries(hashMap).forEach(([ k, val ]) => {
                const { val: cur, set } = state[k]
                const eq = _.isEqual(cur, val)
                console.log(`param ${k}, eq?`, eq, cur, val)
                if (!eq) {
                    console.log(`update state: ${k}, ${cur} -> ${val} (change: ${!eq})`)
                    if (set instanceof Function) {
                        set(val)
                    } else {
                        set.set(val)
                    }
                }
            })
        },
        [ params, state, ]
    )

    useEffect(() => {
        const handleHashChange = () => {
            const curHash = getHash()
            console.log("handleHashChange:", curHash)
            setStates()
        };
        window.addEventListener('hashchange', handleHashChange);
        setStates(initialHash)
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    // // State -> URL query values
    useEffect(
        () => {
            const stateHash = entries(state).map(([ k, { val, param, } ]) => {
                const valStr = param.encode(val)
                if (valStr === undefined) return undefined
                return `${k}=${valStr}`
            }).filter(s=>s).join('&')
            console.log("setting stateHash:", stateHash)
            window.location.hash = stateHash ? `#${stateHash}` : ``
        },
        stateVals,
    )

    return mapValues(state, (k, { val, set, }) => [ val, set, ]) as ParsedParams
}
