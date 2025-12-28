import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'


@Injectable()
export class CacheService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttl)
        } else {
            await this.redis.set(key, JSON.stringify(value))
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.redis.get(key)
        return data ? (JSON.parse(data) as T) : null
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key)
    }

}
