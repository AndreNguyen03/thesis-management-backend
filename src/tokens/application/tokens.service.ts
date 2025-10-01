import { Inject, Injectable } from '@nestjs/common'
import { CreateUserTokenDto } from '../dtos/create-user-token.dto'
import { UserTokenRepositoryInterface } from '../repository/user-tokens.repository.interface'
import { UserTokenRepository } from '../repository/impl/user-tokens.repository'

@Injectable()
export class UserTokensService {
    constructor(private readonly userTokenRepo: UserTokenRepository) {}

    /**
     * Tạo refresh token mới cho device
     */
    async createToken(createUserTokenDto: CreateUserTokenDto) {
        return await this.userTokenRepo.createToken(createUserTokenDto)
    }

    /**
     * Tìm refresh token hợp lệ theo userId + deviceId + refreshToken
     */
    async findValidToken(userId: string, deviceId: string, refreshToken: string) {
        return this.userTokenRepo.findValidToken(userId, deviceId, refreshToken)
    }

    /**
     * Kiểm tra refresh token hợp lệ
     */
    async isRefreshTokenValid(userId: string, deviceId: string, refreshToken: string) {
        const token = await this.findValidToken(userId, deviceId, refreshToken)
        if (token && token.expiresAt && token.expiresAt < new Date()) {
            return false
        }
        return !!token
    }

    /**
     * Rotate refresh token mới cho device
     */
    async saveRefreshToken(createUserTokenDto: CreateUserTokenDto) {
        // Invalidate token cũ của device
        const { userId, deviceId, refreshToken, deviceInfo, ipAddress, expiresAt } = createUserTokenDto

        await this.invalidateToken(userId, deviceId)

        // Tạo token mới
        return this.createToken({ userId, deviceId, refreshToken, deviceInfo, ipAddress, expiresAt })
    }

    /**
     * Invalidate token (logout device)
     */
    async invalidateToken(userId: string, deviceId: string, refreshToken?: string) {
        return await this.userTokenRepo.invalidateToken(userId, deviceId, refreshToken)
    }

    /**
     * Invalidate tất cả token của user (logout tất cả device)
     */
    async invalidateAllUserTokens(userId: string) {
        return this.userTokenRepo.invalidateAllUserTokens(userId)
    }

    /**
     * Lấy tất cả token hợp lệ của user (tùy dùng cho audit / session list)
     */
    async findAllValidTokens(userId: string) {
        return this.userTokenRepo.findAllValidTokens(userId)
    }
}
