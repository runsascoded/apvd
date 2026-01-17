// URL hash parameter utilities (replacing next-utils/params)

export interface Param<T> {
  encode(value: T): string | undefined
  decode(str: string | null): T | null
}

export type HashMapVal<T> = {
  val: T | null
  str: string | null
}

export type ParsedParam<T> = [T | null, (val: T | null) => void]

type ParamsConfig = Record<string, Param<unknown>>

type ParsedParams<P extends ParamsConfig> = {
  [K in keyof P]: ParsedParam<P[K] extends Param<infer T> ? T : never>
}

// Parse the current hash into a map
function parseHash(): Record<string, string> {
  const hash = window.location.hash.slice(1) // Remove #
  if (!hash) return {}

  const result: Record<string, string> = {}
  for (const part of hash.split('&')) {
    const [key, ...valueParts] = part.split('=')
    if (key) {
      result[key] = valueParts.join('=') // Handle values with = in them
    }
  }
  return result
}

// Build hash string from map
function buildHash(map: Record<string, string | undefined>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined && value !== '') {
      parts.push(`${key}=${value}`)
    }
  }
  return parts.length ? '#' + parts.join('&') : ''
}

export function parseHashParams<P extends ParamsConfig>({ params }: { params: P }): ParsedParams<P> {
  const hashMap = parseHash()
  const result = {} as ParsedParams<P>

  for (const key of Object.keys(params) as (keyof P)[]) {
    const param = params[key] as Param<unknown>
    const str = hashMap[key as string] ?? null
    const val = str !== null ? param.decode(str) : null

    // Create getter/setter pair
    const setter = (newVal: unknown | null) => {
      const currentHash = parseHash()
      if (newVal === null) {
        delete currentHash[key as string]
      } else {
        const encoded = param.encode(newVal)
        if (encoded !== undefined) {
          currentHash[key as string] = encoded
        } else {
          delete currentHash[key as string]
        }
      }
      const newHashStr = buildHash(currentHash)
      if (newHashStr !== window.location.hash) {
        window.history.replaceState(null, '', newHashStr || window.location.pathname)
      }
    }

    result[key] = [val, setter] as ParsedParams<P>[typeof key]
  }

  return result
}

export function getHashMap<P extends ParamsConfig, HM extends Record<keyof P, HashMapVal<unknown>>>(
  params: P,
  hash: string
): HM {
  const hashStr = hash.startsWith('#') ? hash.slice(1) : hash
  const hashParts: Record<string, string> = {}
  for (const part of hashStr.split('&')) {
    const [key, ...valueParts] = part.split('=')
    if (key) {
      hashParts[key] = valueParts.join('=')
    }
  }

  const result = {} as HM
  for (const key of Object.keys(params) as (keyof P)[]) {
    const param = params[key] as Param<unknown>
    const str = hashParts[key as string] ?? null
    const val = str !== null ? param.decode(str) : null
    result[key] = { val, str } as HM[typeof key]
  }
  return result
}

export function getHistoryStateHash(): string {
  return window.location.hash
}

export function updatedHash<P extends ParamsConfig>(
  params: P,
  updates: Partial<Record<keyof P, unknown>>,
  currentHash?: string
): string {
  const hashMap = currentHash ? parseHashFromStr(currentHash) : parseHash()

  for (const key of Object.keys(updates) as (keyof P)[]) {
    const param = params[key] as Param<unknown>
    const value = updates[key]
    if (value === null || value === undefined) {
      delete hashMap[key as string]
    } else {
      const encoded = param.encode(value)
      if (encoded !== undefined) {
        hashMap[key as string] = encoded
      } else {
        delete hashMap[key as string]
      }
    }
  }

  return buildHash(hashMap)
}

function parseHashFromStr(hash: string): Record<string, string> {
  const hashStr = hash.startsWith('#') ? hash.slice(1) : hash
  if (!hashStr) return {}

  const result: Record<string, string> = {}
  for (const part of hashStr.split('&')) {
    const [key, ...valueParts] = part.split('=')
    if (key) {
      result[key] = valueParts.join('=')
    }
  }
  return result
}

export function updateHashParams<P extends ParamsConfig>(
  params: P,
  updates: Partial<Record<keyof P, unknown>>,
  options?: { push?: boolean; log?: boolean }
): void {
  const { push = false, log = false } = options ?? {}
  const newHash = updatedHash(params, updates)

  if (log) {
    console.log('updateHashParams:', { updates, newHash, push })
  }

  if (newHash !== window.location.hash) {
    if (push) {
      window.history.pushState(null, '', newHash || window.location.pathname)
    } else {
      window.history.replaceState(null, '', newHash || window.location.pathname)
    }
  }
}

// Simple param helpers
export const intParam: Param<number> = {
  encode: (n) => n.toString(),
  decode: (s) => s ? parseInt(s, 10) : null,
}

export const stringParam: Param<string> = {
  encode: (s) => s,
  decode: (s) => s,
}
