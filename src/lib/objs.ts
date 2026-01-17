// Object utilities (replacing next-utils/objs)

export function entries<K extends string, V>(obj: Record<K, V>): [K, V][] {
  return Object.entries(obj) as [K, V][]
}

export function values<V>(obj: Record<string, V>): V[] {
  return Object.values(obj)
}

export function fromEntries<K extends string | number, V>(entries: [K, V][]): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>
}

export function mapEntries<K extends string, V, R>(
  obj: Record<K, V>,
  fn: (key: K, value: V) => [string, R]
): Record<string, R> {
  return Object.fromEntries(
    entries(obj).map(([k, v]) => fn(k, v))
  ) as Record<string, R>
}
