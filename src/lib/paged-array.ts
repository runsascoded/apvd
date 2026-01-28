/**
 * PagedArray - A generic array that pages chunks to OPFS (Origin Private File System)
 *
 * Key features:
 * - Generic T type for array elements
 * - Configurable chunk size
 * - LRU cache for recent chunks
 * - Async get/set operations
 * - Optional summary extractor for keeping lightweight data in memory
 *
 * Designed to be factored out to a separate library.
 */

export type PagedArrayOptions<T, S = void> = {
  /** Name for the OPFS directory (unique per array instance) */
  name: string
  /** Number of items per chunk (default: 100) */
  chunkSize?: number
  /** Maximum chunks to keep in memory (default: 5) */
  maxCachedChunks?: number
  /** Optional function to extract summary data kept in memory for all items */
  extractSummary?: (item: T, index: number) => S
  /** Optional custom serializer (default: JSON.stringify) */
  serialize?: (chunk: T[]) => string
  /** Optional custom deserializer (default: JSON.parse) */
  deserialize?: (data: string) => T[]
}

type ChunkMeta = {
  index: number
  dirty: boolean
  lastAccess: number
}

export class PagedArray<T, S = void> {
  private name: string
  private chunkSize: number
  private maxCachedChunks: number
  private extractSummary?: (item: T, index: number) => S
  private serialize: (chunk: T[]) => string
  private deserialize: (data: string) => T[]

  // In-memory state
  private chunks: Map<number, T[]> = new Map()
  private chunkMeta: Map<number, ChunkMeta> = new Map()
  private summaries: S[] = []
  private _length: number = 0

  // OPFS handles
  private dirHandle: FileSystemDirectoryHandle | null = null
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null
  private evicting: boolean = false

  constructor(options: PagedArrayOptions<T, S>) {
    this.name = options.name
    this.chunkSize = options.chunkSize ?? 100
    this.maxCachedChunks = options.maxCachedChunks ?? 5
    this.extractSummary = options.extractSummary
    this.serialize = options.serialize ?? JSON.stringify
    this.deserialize = options.deserialize ?? JSON.parse
  }

  /** Initialize OPFS directory */
  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._init()
    await this.initPromise
  }

  private async _init(): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory()
      this.dirHandle = await root.getDirectoryHandle(this.name, { create: true })

      // Load metadata if exists
      await this.loadMetadata()
      this.initialized = true
    } catch (e) {
      console.error('Failed to initialize OPFS for PagedArray:', e)
      // Fall back to memory-only mode
      this.initialized = true
    }
  }

  /** Current length of the array */
  get length(): number {
    return this._length
  }

  /** Get all summaries (kept in memory) */
  getSummaries(): S[] {
    return this.summaries
  }

  /** Get item at index (may load from OPFS) */
  async get(index: number): Promise<T | undefined> {
    if (index < 0 || index >= this._length) return undefined

    const chunkIndex = Math.floor(index / this.chunkSize)
    const chunk = await this.loadChunk(chunkIndex)
    const offsetInChunk = index % this.chunkSize
    return chunk?.[offsetInChunk]
  }

  /** Get a range of items (optimized batch loading) */
  async getRange(start: number, end: number): Promise<T[]> {
    const result: T[] = []
    const startChunk = Math.floor(start / this.chunkSize)
    const endChunk = Math.floor(Math.max(0, end - 1) / this.chunkSize)

    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      const chunk = await this.loadChunk(chunkIndex)
      if (!chunk) continue

      const chunkStart = chunkIndex * this.chunkSize
      const localStart = Math.max(0, start - chunkStart)
      const localEnd = Math.min(this.chunkSize, end - chunkStart)

      for (let i = localStart; i < localEnd && i < chunk.length; i++) {
        result.push(chunk[i])
      }
    }

    return result
  }

  /** Append item to the array */
  async push(item: T): Promise<number> {
    const index = this._length
    const chunkIndex = Math.floor(index / this.chunkSize)

    // Load or create chunk
    let chunk = this.chunks.get(chunkIndex)
    if (!chunk) {
      chunk = []
      this.chunks.set(chunkIndex, chunk)
      this.chunkMeta.set(chunkIndex, { index: chunkIndex, dirty: true, lastAccess: Date.now() })
    }

    chunk.push(item)
    this._length++

    // Update chunk metadata
    const meta = this.chunkMeta.get(chunkIndex)!
    meta.dirty = true
    meta.lastAccess = Date.now()

    // Extract and store summary
    if (this.extractSummary) {
      this.summaries.push(this.extractSummary(item, index))
    }

    // Evict old chunks if needed
    await this.evictIfNeeded()

    return index
  }

  /** Append multiple items */
  async pushMany(items: T[]): Promise<void> {
    for (const item of items) {
      await this.push(item)
    }
  }

  /** Clear the array and OPFS storage */
  async clear(): Promise<void> {
    this.chunks.clear()
    this.chunkMeta.clear()
    this.summaries = []
    this._length = 0

    if (this.dirHandle) {
      try {
        // Remove all chunk files
        for await (const name of (this.dirHandle as any).keys()) {
          await this.dirHandle.removeEntry(name)
        }
      } catch (e) {
        console.warn('Failed to clear OPFS directory:', e)
      }
    }
  }

  /** Flush all dirty chunks to OPFS */
  async flush(): Promise<void> {
    for (const [chunkIndex, meta] of this.chunkMeta) {
      if (meta.dirty) {
        await this.saveChunk(chunkIndex)
      }
    }
    await this.saveMetadata()
  }

  /** Load a chunk (from memory or OPFS) */
  private async loadChunk(chunkIndex: number): Promise<T[] | undefined> {
    // Check memory cache first
    if (this.chunks.has(chunkIndex)) {
      const meta = this.chunkMeta.get(chunkIndex)!
      meta.lastAccess = Date.now()
      return this.chunks.get(chunkIndex)
    }

    // Load from OPFS
    if (!this.dirHandle) return undefined

    try {
      const fileName = `chunk_${chunkIndex}.json`
      const fileHandle = await this.dirHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const data = await file.text()
      const chunk = this.deserialize(data)

      // Add to cache
      this.chunks.set(chunkIndex, chunk)
      this.chunkMeta.set(chunkIndex, { index: chunkIndex, dirty: false, lastAccess: Date.now() })

      // Evict old chunks if needed
      await this.evictIfNeeded()

      return chunk
    } catch (e) {
      // File doesn't exist yet
      return undefined
    }
  }

  /** Save a chunk to OPFS */
  private async saveChunk(chunkIndex: number): Promise<void> {
    if (!this.dirHandle) return
    const chunk = this.chunks.get(chunkIndex)
    if (!chunk) return

    try {
      const fileName = `chunk_${chunkIndex}.json`
      const fileHandle = await this.dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(this.serialize(chunk))
      await writable.close()

      // Meta may have been deleted by concurrent eviction during async save
      const meta = this.chunkMeta.get(chunkIndex)
      if (meta) {
        meta.dirty = false
      }
    } catch (e) {
      console.error(`Failed to save chunk ${chunkIndex}:`, e)
    }
  }

  /** Evict least recently used chunks to stay within cache limit */
  private async evictIfNeeded(): Promise<void> {
    // Don't evict if OPFS is unavailable (can't reload evicted chunks)
    if (!this.dirHandle) return

    // Prevent concurrent evictions
    if (this.evicting) return
    this.evicting = true

    try {
      while (this.chunks.size > this.maxCachedChunks) {
        // Find LRU chunk
        let oldestTime = Infinity
        let oldestChunk = -1

        for (const [chunkIndex, meta] of this.chunkMeta) {
          if (meta.lastAccess < oldestTime) {
            oldestTime = meta.lastAccess
            oldestChunk = chunkIndex
          }
        }

        if (oldestChunk >= 0) {
          // Save if dirty before evicting
          const meta = this.chunkMeta.get(oldestChunk)
          if (meta?.dirty) {
            await this.saveChunk(oldestChunk)
          }

          this.chunks.delete(oldestChunk)
          this.chunkMeta.delete(oldestChunk)
        } else {
          break
        }
      }
    } finally {
      this.evicting = false
    }
  }

  /** Save metadata (length, summaries) to OPFS */
  private async saveMetadata(): Promise<void> {
    if (!this.dirHandle) return

    try {
      const fileHandle = await this.dirHandle.getFileHandle('_meta.json', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify({
        length: this._length,
        summaries: this.summaries,
      }))
      await writable.close()
    } catch (e) {
      console.error('Failed to save metadata:', e)
    }
  }

  /** Load metadata from OPFS */
  private async loadMetadata(): Promise<void> {
    if (!this.dirHandle) return

    try {
      const fileHandle = await this.dirHandle.getFileHandle('_meta.json')
      const file = await fileHandle.getFile()
      const data = await file.text()
      const meta = JSON.parse(data)
      this._length = meta.length || 0
      this.summaries = meta.summaries || []
    } catch (e) {
      // Metadata doesn't exist yet
      this._length = 0
      this.summaries = []
    }
  }
}

/**
 * React hook for using PagedArray
 */
export function usePagedArray<T, S = void>(options: PagedArrayOptions<T, S>) {
  // This will be implemented when integrating with React
  // For now, create the array directly
  return new PagedArray<T, S>(options)
}
