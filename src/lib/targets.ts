import * as apvd from "apvd";
import {fromEntries} from "next-utils/objs";
import {Param} from "next-utils/params";

export type Target = [ string, number ]

export type Targets = {
    givenInclusive: boolean
    exclusive: Target[]
    inclusive: Target[]
    all: Map<string, number>
    numShapes: number
    noneKey: string
    allKey: string
}

export const makeSortKeys = (ch: string) => ([ a ]: Target, [ b ]: Target) => {
    let numSetsA = a.split('').filter(c => c != ch).length
    let numSetsB = b.split('').filter(c => c != ch).length
    if (numSetsA == numSetsB) {
        return -a.localeCompare(b)
    } else {
        return numSetsA - numSetsB
    }
}
export const inclusiveKeyCmp = makeSortKeys('*')
export const exclusiveKeyCmp = makeSortKeys('-')

export function makeTargets(given: Target[]): Targets {
    const numShapes = given[0][0].length
    const all = apvd.expand_targets(given).all as Map<string, number>
    const noneKey = '-'.repeat(numShapes)
    const allKey = '*'.repeat(numShapes)
    const exclusive: Target[] = []
    const inclusive: Target[] = []
    // console.log("targets:", targets)
    all.forEach((value, key) => {
        if (!key.includes('*') && key != noneKey) {
            exclusive.push([ key, value ])
        }
        if (!key.includes('-') && key != allKey) {
            inclusive.push([ key, value ])
        }
    })
    inclusive.sort(inclusiveKeyCmp)
    exclusive.sort(exclusiveKeyCmp)
    return {
        givenInclusive: given[0][0].includes('*'),
        exclusive,
        inclusive,
        all,
        numShapes,
        noneKey,
        allKey,
    }
}

export type KeySet = string[]

export function makeKeys(n: number, inclusive: boolean): string[] {
    if (n == 0) {
        return ['']
    }
    if (n >= 10) {
        throw new Error(`makeKeys: n >= 10: ${n}`)
    }
    const c = (n - 1).toString()
    const suffixes = makeKeys(n - 1, inclusive)
    const _ = inclusive ? '*' : '-'
    return ([] as string[]).concat(
        suffixes.map(s => s + _),
        suffixes.map(s => s + c),
    )
}

export function makeKeySet(n: number, inclusive?: boolean): KeySet {
    const keySet = makeKeys(n, inclusive || false)
    const [ first, ...rest ] = keySet
    const ch = inclusive ? '*' : '-'
    const firstKeySentinel = String(ch).repeat(n)
    if (first != firstKeySentinel) {
        throw new Error(`makeKeySet(${n}, ${inclusive}): first != String('${ch}').repeat(${n}): ${first} != ${firstKeySentinel}`)
    }
    return rest
}
export const KeySets: { [length: number]: { inclusive: KeySet, exclusive: KeySet } } = fromEntries(
    Array(6).fill(0).map((_, i) => {
        const exclusive = makeKeySet(i, false)
        const inclusive = makeKeySet(i, true)
        if (exclusive.length != inclusive.length) {
            throw new Error(`KeySets: exclusive.length != inclusive.length: ${exclusive.length} != ${inclusive.length}`)
        }
        return [ inclusive.length, { inclusive, exclusive, } ]
    })
)

export const targetsParam: Param<Targets | null> = {
    encode: (targets: Targets | null): string | undefined => {
        if (!targets) {
            return undefined
        }
        const { exclusive, inclusive, givenInclusive } = targets
        const tgtList = givenInclusive ? inclusive : exclusive
        const length = tgtList.length
        if (!(length in KeySets)) {
            throw new Error(`targetsParam: length not in KeySets: ${length}, {${Object.entries(KeySets).map(([ len ]) => len).join(', ')}}`)
        }
        const keys = KeySets[length]
        const keySet = givenInclusive ? keys.inclusive : keys.exclusive
        const targetsMap = new Map(targets.all)
        return (givenInclusive ? 'i' : '') + keySet.map(key => {
            const val = targetsMap.get(key)
            if (val === undefined) {
                throw new Error(`targetsParam: !targetsMap.has(key): ${key}, keys: ${Array.from(targets.all.keys()).join(', ')}`)
            }
            return val.toString()
        }).join(',')
    },
    decode: (s: string | undefined): Targets | null => {
        if (s === undefined) {
            return null
        }
        let givenInclusive = false
        if (s[0] == 'i') {
            givenInclusive = true
            s = s.substring(1)
        }
        const values = s.split(',')
        const len = values.length
        if (!(len in KeySets)) {
            throw new Error(`targetsParam: len not in KeySets: ${len}, {${Object.entries(KeySets).map(([ len ]) => len).join(', ')}}`)
        }
        const keys = KeySets[len]
        const keySet = givenInclusive ? keys.inclusive : keys.exclusive
        const given = values.map((value, idx) => [ keySet[idx], parseFloat(value) ] as Target)
        return makeTargets(given)
    }
}
