import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User } from 'src/users/schemas/user.schema'
import jwtConfig from '../config/jwt.config'
import { ConfigType } from '@nestjs/config'
import {
    RefreshTokenExpiredException,
    TokenDeviceMismatchException,
    TokenInvalidException,
    TokenNotFoundException,
    UserInactiveException,
    UserNotFoundException
} from 'src/common/exceptions'
import { ActiveUserData } from '../interface/active-user-data.interface'
import { UsersService } from 'src/users/application/users.service'
import { UserTokensService } from 'src/tokens/application/tokens.service'

@Injectable()
export class TokenProvider {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(jwtConfig.KEY)
        private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
        private readonly usersService: UsersService,
        private readonly userTokensService: UserTokensService
    ) {}

    public async issueTokens(user: User, deviceInfo: string, ipAddress: string) {
        const userId = user._id?.toString()
        if (!userId) {
            throw new Error('User ID is missing')
        }
        // 1. Sinh deviceId cho session
        const deviceId = crypto.randomUUID()

        // 2. Generate tokens
        const tokens = await this.generateToken(user, deviceId)

        // 3. Lưu refresh token vào DB
        await this.userTokensService.createToken({
            userId,
            refreshToken: tokens.refreshToken,
            deviceId,
            deviceInfo,
            ipAddress,
            expiresAt: new Date(Date.now() + this.jwtConfiguration.refreshTokenTTL * 1000)
        })

        // 4. Trả về tokens + deviceId cho FE
        return tokens
    }

    public async refreshTokens(refreshToken: string) {
        if (!refreshToken) throw new TokenNotFoundException()

        let payload: Pick<ActiveUserData, 'sub' | 'deviceId'>
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.jwtConfiguration.secret,
                audience: this.jwtConfiguration.audience,
                issuer: this.jwtConfiguration.issuer
            })
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') throw new RefreshTokenExpiredException()
            throw new TokenInvalidException()
        }

        const { sub: userId, deviceId } = payload

        // Check token trong DB
        const tokenInDb = await this.userTokensService.findValidToken(userId, deviceId, refreshToken)
        if (!tokenInDb) throw new TokenNotFoundException()
        if (tokenInDb.deviceId !== deviceId) throw new TokenDeviceMismatchException()

        // Fetch user
        const user: User = await this.usersService.findOneById(userId)
        if (!user) throw new UserNotFoundException()
        if (!user.isActive) throw new UserInactiveException()

        // Generate new tokens (rotate refresh token)
        const tokens = await this.generateToken(user, deviceId)

        // Rotate refresh token trong DB
        await this.userTokensService.saveRefreshToken({
            userId,
            deviceId,
            refreshToken: tokens.refreshToken,
            deviceInfo: tokenInDb.deviceInfo, // giữ lại deviceInfo cũ
            ipAddress: tokenInDb.ipAddress, // giữ lại ip cũ
            expiresAt: new Date(Date.now() + this.jwtConfiguration.refreshTokenTTL * 1000)
        })

        return tokens
    }

    public async signToken<T>(userId: string, expiresIn: number, payload?: T) {
        return await this.jwtService.signAsync(
            {
                sub: userId,
                ...payload
            },
            {
                audience: this.jwtConfiguration.audience,
                issuer: this.jwtConfiguration.issuer,
                secret: this.jwtConfiguration.secret,
                expiresIn
            }
        )
    }

    public async generateToken(user: User, deviceId: string) {
        const userId = user._id?.toString()
        if (!userId) {
            throw new Error('User ID is missing')
        }

        const [accessToken, refreshToken] = await Promise.all([
            // gen access token
            this.signToken<Partial<ActiveUserData>>(
                userId,
                this.jwtConfiguration.accessTokenTTL,
                {
                    email: user.email,
                    deviceId: deviceId,
                    role: user.role
                }
            ),

            // gen refresh token
            this.signToken<Partial<ActiveUserData>>(
                userId,
                this.jwtConfiguration.refreshTokenTTL,
                {
                    email: user.email,
                    deviceId: deviceId,
                    role: user.role
                }
            )
        ])

        return { accessToken, refreshToken }
    }
}
