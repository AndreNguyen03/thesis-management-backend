// online.service.ts
import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class OnlineService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    // ========== USER SOCKET MANAGEMENT ==========

    /**
     * Thêm socket ID của user vào Redis
     * Key: online:chat:userId -> Set of socketIds
     */
    async addUserSocket(namespace: string, userId: string, socketId: string): Promise<void> {
        const key = `online:${namespace}:${userId}`
        await this.redis.sadd(key, socketId)
        await this.redis.expire(key, 86400) // 24 giờ
    }

    /**
     * Xóa socket ID khi user disconnect
     */
    async removeUserSocket(namespace: string, userId: string, socketId: string): Promise<void> {
        const key = `online:${namespace}:${userId}`
        await this.redis.srem(key, socketId)
    }

    /**
     * Kiểm tra user có đang online không (có ít nhất 1 socket)
     */
    async isUserOnline(namespace: string, userId: string): Promise<boolean> {
        const key = `online:${namespace}:${userId}`
        const count = await this.redis.scard(key)
        return count > 0
    }

    // ========== USER-GROUPS MAPPING ==========

    /**
     * Lưu danh sách group IDs mà user tham gia
     * Key: user_groups:chat:userId -> Set of groupIds
     */
    async setUserGroups(namespace: string, userId: string, groupIds: string[]): Promise<void> {
        const key = `user_groups:${namespace}:${userId}`
        await this.redis.del(key)

        if (groupIds.length > 0) {
            await this.redis.sadd(key, ...groupIds)
            await this.redis.expire(key, 86400)
        }
    }

    /**
     * Lấy danh sách groups mà user đang tham gia
     */
    async getUserGroups(namespace: string, userId: string): Promise<string[]> {
        const key = `user_groups:${namespace}:${userId}`
        return this.redis.smembers(key)
    }

    // ========== GROUP-MEMBERS MAPPING ==========

    /**
     * Lưu danh sách member IDs của một group
     * Key: group_members:chat:groupId -> Set of userIds
     */
    async setGroupMembers(namespace: string, groupId: string, memberIds: string[]): Promise<void> {
        const key = `group_members:${namespace}:${groupId}`
        await this.redis.del(key)

        if (memberIds.length > 0) {
            await this.redis.sadd(key, ...memberIds)
            await this.redis.expire(key, 86400)
        }
    }

    /**
     * Lấy danh sách members của group
     */
    async getGroupMembers(namespace: string, groupId: string): Promise<string[]> {
        const key = `group_members:${namespace}:${groupId}`
        return this.redis.smembers(key)
    }

    // ========== BATCH ONLINE STATUS CHECK ==========

    /**
     * Lấy online status của nhiều users cùng lúc (optimize performance)
     * Return: { userId: true/false }
     */
    async getUsersOnlineStatus(namespace: string, userIds: string[]): Promise<Record<string, boolean>> {
        if (userIds.length === 0) return {}

        const pipeline = this.redis.pipeline()

        userIds.forEach((userId) => {
            pipeline.scard(`online:${namespace}:${userId}`)
        })

        const results = await pipeline.exec()

        if (!results) {
            // Redis lỗi → coi như tất cả offline
            return Object.fromEntries(userIds.map((id) => [id, false]))
        }

        const statusMap: Record<string, boolean> = {}

        userIds.forEach((userId, index) => {
            const count = results[index][1] as number
            statusMap[userId] = count > 0
        })

        return statusMap
    }

    /**
     * Helper: Lấy danh sách members đang online trong group
     */
    async getGroupOnlineMembers(namespace: string, groupId: string): Promise<string[]> {
        const allMembers = await this.getGroupMembers(namespace, groupId)
        const onlineStatus = await this.getUsersOnlineStatus(namespace, allMembers)

        return allMembers.filter((userId) => onlineStatus[userId])
    }
}
