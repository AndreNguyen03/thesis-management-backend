import { Inject, Injectable } from '@nestjs/common'
import { CreateUserTokenDto } from '../dtos/create-user-token.dto'
import { UserTokenRepositoryInterface } from '../repository/user-tokens.repository.interface'

@Injectable()
export class UserTokensService {
    constructor(
        @Inject('UserTokenRepositoryInterface')
        private readonly userTokenRepo: UserTokenRepositoryInterface
    ) {}

    /**
     * Tạo refresh token mới cho device
     */
    async createToken(createUserTokenDto: CreateUserTokenDto) {
        const token = await this.userTokenRepo.create({
            ...createUserTokenDto,
            isValid: true
        })
        return token
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
        const query: any = { userId, deviceId }
        if (refreshToken) query.refreshToken = refreshToken

        return this.userTokenRepo.updateByCondition(query, { isValid: false })
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
