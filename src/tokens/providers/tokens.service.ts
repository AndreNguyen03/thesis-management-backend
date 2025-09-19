import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { UserToken } from '../schemas/token.schema'

@Injectable()
export class TokensService {
    constructor(@InjectModel(UserToken.name) private tokenModel: Model<UserToken>) {}

    /**
     * Tạo refresh token mới cho device
     */
    async createToken(payload: {
        userId: Types.ObjectId
        refreshToken: string
        deviceId: string
        deviceInfo?: string
        ipAddress?: string
        expiresAt?: Date
    }) {
        const token = await this.tokenModel.create({
            ...payload,
            isValid: true
        })
        return token
    }

    /**
     * Tìm refresh token hợp lệ theo userId + deviceId + refreshToken
     */
    async findValidToken(userId: Types.ObjectId, deviceId: string, refreshToken: string) {
        return this.tokenModel
            .findOne({
                userId,
                deviceId,
                refreshToken,
                isValid: true
            })
            .exec()
    }

    /**
     * Kiểm tra refresh token hợp lệ
     */
    async isRefreshTokenValid(userId: Types.ObjectId, deviceId: string, refreshToken: string) {
        const token = await this.findValidToken(userId, deviceId, refreshToken)
        console.log('Found token:', token)
        // log token expire at
        console.log('Token expires at:', token?.expiresAt)
        // log check expireat
        console.log('Current time:', new Date())
        // Có thể check thêm expiresAt nếu muốn enforce thời hạn
        if (token && token.expiresAt && token.expiresAt < new Date()) {
            return false
        }
        return !!token
    }

    /**
     * Rotate refresh token mới cho device
     */
    async saveRefreshToken(
        userId: Types.ObjectId,
        deviceId: string,
        refreshToken: string,
        deviceInfo?: string,
        ipAddress?: string,
        expiresAt?: Date
    ) {
        // Invalidate token cũ của device
        await this.invalidateToken(userId, deviceId)

        // Tạo token mới
        return this.createToken({ userId, deviceId, refreshToken, deviceInfo, ipAddress, expiresAt })
    }

    /**
     * Invalidate token (logout device)
     */
    async invalidateToken(userId: Types.ObjectId, deviceId: string, refreshToken?: string) {
        const query: any = { userId, deviceId }
        if (refreshToken) query.refreshToken = refreshToken

        return this.tokenModel.updateOne(query, { isValid: false }).exec()
    }

    /**
     * Invalidate tất cả token của user (logout tất cả device)
     */
    async invalidateAllUserTokens(userId: Types.ObjectId) {
        return this.tokenModel.updateMany({ userId }, { isValid: false }).exec()
    }

    /**
     * Lấy tất cả token hợp lệ của user (tùy dùng cho audit / session list)
     */
    async findAllValidTokens(userId: Types.ObjectId) {
        return this.tokenModel.find({ userId, isValid: true }).exec()
    }
}
