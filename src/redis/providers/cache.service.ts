import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name)
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttl)
        } else {
            await this.redis.set(key, JSON.stringify(value))
        }
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.redis.get(key)
            return data ? (JSON.parse(data) as T) : null
        } catch (err) {
            console.warn(`[CACHE GET FAILED] ${key}`, err.message)
            return null
        }
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key)
    }

    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.get<T>(key)
        if (cached !== null) {
            this.logger.debug(`[CACHE HIT] ${key}`)
            return cached
        }

        const data = await fetchFn()
        await this.set(key, data, ttl)
        return data
    }

    /**
     * Xóa cache
     */
    delete(key: string): void {
        this.redis.del(key)
        this.logger.debug(`Cache DELETE: ${key}`)
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.redis.flushall()
        this.logger.debug('Cache CLEARED')
    }
}
