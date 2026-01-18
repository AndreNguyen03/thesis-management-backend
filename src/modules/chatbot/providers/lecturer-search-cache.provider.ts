import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

export interface CacheStats {
    hits: number
    misses: number
    size: number
    hitRate: number
}

@Injectable()
export class LecturerSearchCacheProvider {
    private cache = new Map<string, CacheEntry<any>>()
    private stats = {
        hits: 0,
        misses: 0
    }

    private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
    private readonly MAX_CACHE_SIZE = 1000

    /**
     * Generate cache key from params
     */
    private generateKey(prefix: string, params: any): string {
        const str = JSON.stringify(params)
        const hash = createHash('md5').update(str).digest('hex')
        return `${prefix}:${hash}`
    }

    /**
     * Get cached value
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key)

        if (!entry) {
            this.stats.misses++
            return null
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key)
            this.stats.misses++
            return null
        }

        this.stats.hits++
        console.log(`✅ [CACHE HIT] ${key}`)
        return entry.data as T
    }

    /**
     * Set cache value
     */
    set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        // Cleanup if cache is too large
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictOldest()
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        })

        console.log(`💾 [CACHE SET] ${key} (TTL: ${ttl}ms)`)
    }

    /**
     * Cache query parsing results
     */
    async cacheQueryParsing<T>(query: string, fetcher: () => Promise<T>): Promise<T> {
        const key = this.generateKey('query_parse', { query })
        const cached = this.get<T>(key)

        if (cached) return cached

        const result = await fetcher()
        this.set(key, result, 10 * 60 * 1000) // 10 min for parsing

        return result
    }

    /**
     * Cache embedding results
     */
    async cacheEmbedding<T>(text: string, fetcher: () => Promise<T>): Promise<T> {
        const key = this.generateKey('embedding', { text: text.substring(0, 200) }) // Hash first 200 chars
        const cached = this.get<T>(key)

        if (cached) return cached

        const result = await fetcher()
        this.set(key, result, 30 * 60 * 1000) // 30 min for embeddings (stable)

        return result
    }

    /**
     * Cache search results
     */
    async cacheSearchResults<T>(query: string, options: any, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
        const key = this.generateKey('search', { query, options })
        const cached = this.get<T>(key)

        if (cached) return cached

        const result = await fetcher()
        this.set(key, result, ttl || this.DEFAULT_TTL)

        return result
    }

    /**
     * Clear cache by prefix
     */
    clearByPrefix(prefix: string): number {
        let count = 0
        const keys = Array.from(this.cache.keys())

        keys.forEach((key) => {
            if (key.startsWith(prefix)) {
                this.cache.delete(key)
                count++
            }
        })

        console.log(`🗑️ [CACHE CLEAR] Removed ${count} entries with prefix: ${prefix}`)
        return count
    }

    /**
     * Clear all cache
     */
    clearAll(): void {
        const size = this.cache.size
        this.cache.clear()
        console.log(`🗑️ [CACHE CLEAR ALL] Removed ${size} entries`)
    }

    /**
     * Evict oldest entries
     */
    private evictOldest(count: number = 100): void {
        const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)

        const toRemove = entries.slice(0, count)
        toRemove.forEach(([key]) => this.cache.delete(key))

        console.log(`🗑️ [CACHE EVICT] Removed ${toRemove.length} oldest entries`)
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0
        }
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats.hits = 0
        this.stats.misses = 0
    }

    /**
     * Invalidate search cache (call after lecturer profile update)
     */
    invalidateSearchCache(): void {
        this.clearByPrefix('search')
        console.log('🔄 [CACHE INVALIDATE] Search cache invalidated')
    }

    /**
     * Warmup cache with common queries
     */
    async warmup(queries: string[], fetcher: (query: string) => Promise<any>): Promise<void> {
        console.log(`🔥 [CACHE WARMUP] Warming up ${queries.length} queries...`)

        for (const query of queries) {
            try {
                await this.cacheSearchResults(query, {}, () => fetcher(query))
            } catch (error) {
                console.error(`❌ [CACHE WARMUP] Failed for query "${query}":`, error.message)
            }
        }

        console.log('✅ [CACHE WARMUP] Completed')
    }
}
