import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
//Service to manage online users
@Injectable()
export class OnlineUserService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    async addSocket(userId: string, socketId: string) {
        await this.redis.sadd(`online:${userId}`, socketId)
    }

    async removeSocket(userId: string, socketId: string) {
        await this.redis.srem(`online:${userId}`, socketId)
    }

    async isUserOnline(userId: string) {
        const count = await this.redis.scard(`online:${userId}`)
        return count > 0
    }

    async getSockets(userId: string) {
        return (await this.redis.smembers(`online:${userId}`)) || []
    }

    // Lấy tất cả userIds online (scan keys online:*, check scard > 0)
    async getAllOnlineUsers(): Promise<string[]> {
        const keys = await this.redis.keys('online:*') // Lấy all keys online:*
        if (keys.length === 0) return []

        const onlinePromises = keys.map(async (key: string) => {
            const userId = key.replace('online:', '') // Extract userId
            const count = await this.redis.scard(key)
            return count > 0 ? userId : null
        })

        const results = await Promise.all(onlinePromises)
        return results.filter((id): id is string => id !== null) // Filter null
    }
}
