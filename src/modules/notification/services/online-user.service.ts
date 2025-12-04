import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

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
}
