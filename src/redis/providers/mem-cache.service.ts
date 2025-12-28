// services/cache.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { CACHE_TTL } from '../constants/cache.constants'

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

@Injectable()
export class MemCacheService {
    private readonly logger = new Logger(MemCacheService.name)
    private readonly cache = new Map<string, CacheEntry<any>>()

    // Cache keys
    static readonly TOPIC_EMBEDDINGS_KEY = 'topic_embeddings'
    static readonly TOPIC_SUMMARIES_KEY = 'topic_summaries'
    static readonly STUDENT_PROFILE_KEY = (id: string) => `student_profile_${id}`
    static readonly PIPELINE_RESULTS_KEY = (studentId: string) => `pipeline_results_${studentId}`

    /**
     * Set cache với TTL
     */
    set<T>(key: string, data: T, ttl: number = CACHE_TTL.DEFAULT): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        })

        this.logger.debug(`Cache SET: ${key} (ttl: ${ttl}ms)`)
    }

    /**
     * Get từ cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key)

        if (!entry) {
            return null
        }

        // Check expiration
        const isExpired = Date.now() - entry.timestamp > entry.ttl

        if (isExpired) {
            this.cache.delete(key)
            this.logger.debug(`Cache EXPIRED: ${key}`)
            return null
        }

        this.logger.debug(`Cache HIT: ${key}`)
        return entry.data as T
    }

    /**
     * Xóa cache
     */
    delete(key: string): void {
        this.cache.delete(key)
        this.logger.debug(`Cache DELETE: ${key}`)
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear()
        this.logger.debug('Cache CLEARED')
    }

    /**
     * Get với fallback function
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = CACHE_TTL.DEFAULT): Promise<T> {
        const cached = this.get<T>(key)

        if (cached !== null) {
            return cached
        }

        const data = await fetchFn()
        this.set(key, data, ttl)
        return data
    }

    /**
     * Stats
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        }
    }
}
