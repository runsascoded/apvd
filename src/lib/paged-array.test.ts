import { describe, it, expect } from 'vitest'
import { PagedArray } from './paged-array'

// Tests run in Node.js where OPFS isn't available.
// PagedArray falls back to memory-only mode, which we can still test.

describe('PagedArray (memory-only fallback)', () => {
  it('should push and get items', async () => {
    const arr = new PagedArray<number>({
      name: 'test-array',
      chunkSize: 3,
      maxCachedChunks: 2,
    })
    await arr.init()

    await arr.push(1)
    await arr.push(2)
    await arr.push(3)

    expect(arr.length).toBe(3)
    expect(await arr.get(0)).toBe(1)
    expect(await arr.get(1)).toBe(2)
    expect(await arr.get(2)).toBe(3)
  })

  it('should extract summaries', async () => {
    const arr = new PagedArray<{ value: number }, number>({
      name: 'test-summary',
      chunkSize: 2,
      extractSummary: (item) => item.value * 2,
    })
    await arr.init()

    await arr.push({ value: 1 })
    await arr.push({ value: 2 })
    await arr.push({ value: 3 })

    const summaries = arr.getSummaries()
    expect(summaries).toEqual([2, 4, 6])
  })

  it('should get range of items', async () => {
    const arr = new PagedArray<number>({
      name: 'test-range',
      chunkSize: 2,
    })
    await arr.init()

    for (let i = 0; i < 5; i++) {
      await arr.push(i)
    }

    const range = await arr.getRange(1, 4)
    expect(range).toEqual([1, 2, 3])
  })

  it('should handle out of bounds access', async () => {
    const arr = new PagedArray<number>({
      name: 'test-bounds',
    })
    await arr.init()

    await arr.push(1)

    expect(await arr.get(-1)).toBeUndefined()
    expect(await arr.get(1)).toBeUndefined()
    expect(await arr.get(100)).toBeUndefined()
  })

  it('should clear all data', async () => {
    const arr = new PagedArray<number>({
      name: 'test-clear',
    })
    await arr.init()

    await arr.push(1)
    await arr.push(2)
    await arr.clear()

    expect(arr.length).toBe(0)
    expect(arr.getSummaries()).toEqual([])
  })

  it('should keep all items in memory when OPFS unavailable', async () => {
    const arr = new PagedArray<number>({
      name: 'test-no-evict',
      chunkSize: 2,
      maxCachedChunks: 2, // Would limit to 4 items with OPFS
    })
    await arr.init()

    // Push 10 items (5 chunks)
    for (let i = 0; i < 10; i++) {
      await arr.push(i)
    }

    // Length should be preserved
    expect(arr.length).toBe(10)

    // All items should be readable (no eviction without OPFS)
    for (let i = 0; i < 10; i++) {
      expect(await arr.get(i)).toBe(i)
    }
  })

  it('should handle pushMany', async () => {
    const arr = new PagedArray<number>({
      name: 'test-many',
    })
    await arr.init()

    await arr.pushMany([1, 2, 3, 4, 5])

    expect(arr.length).toBe(5)
    expect(await arr.get(0)).toBe(1)
    expect(await arr.get(4)).toBe(5)
  })

  it('should handle complex objects', async () => {
    type Item = { x: number, y: string, nested: { z: boolean } }
    const arr = new PagedArray<Item>({
      name: 'test-complex',
    })
    await arr.init()

    const item: Item = { x: 1, y: 'test', nested: { z: true } }
    await arr.push(item)

    const retrieved = await arr.get(0)
    expect(retrieved).toEqual(item)
  })
})
