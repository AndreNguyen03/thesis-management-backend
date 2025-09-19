import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { RefreshTokenDto } from '../dtos/refresh-token.dto'
import { JwtService } from '@nestjs/jwt'
import jwtConfig from '../config/jwt.config'
import { ConfigType } from '@nestjs/config'
import { GenerateTokensProvider } from './generate-tokens.provider'
import { UsersService } from 'src/users/providers/users.service'
import { ActiveUserData } from '../interface/active-user-data.interface'
import { TokensService } from 'src/tokens/providers/tokens.service'
import { UserDocument } from 'src/users/schemas/user.schema'
import { Types } from 'mongoose'
import {
    RefreshTokenExpiredException,
    TokenInvalidException,
    TokenNotFoundException,
    TokenDeviceMismatchException
} from 'src/common/exceptions/auth-exceptions'
import { UserNotFoundException, UserInactiveException } from 'src/common/exceptions/user-exceptions'

@Injectable()
export class RefreshTokensProvider {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(jwtConfig.KEY)
        private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
        private readonly generateTokensProvider: GenerateTokensProvider,
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,
        private readonly tokensService: TokensService
    ) {}

    public async refreshTokens(refreshTokenDto: RefreshTokenDto) {
        const { refreshToken } = refreshTokenDto

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
        const userObjectId = new Types.ObjectId(userId)

        // Check token in DB
        const tokenInDb = await this.tokensService.findValidToken(userObjectId, deviceId, refreshToken)
        if (!tokenInDb) throw new TokenNotFoundException()
        if (tokenInDb.deviceId !== deviceId) throw new TokenDeviceMismatchException()

        // Fetch user
        const user: UserDocument = await this.usersService.findOneById(userId)
        if (!user) throw new UserNotFoundException()
        if (!user.isActive) throw new UserInactiveException()

        // Generate new tokens (rotate refresh token)
        const tokens = await this.generateTokensProvider.generateToken(user, deviceId)

        // Rotate new refresh token in DB
        await this.tokensService.saveRefreshToken(userObjectId, deviceId, tokens.refreshToken)

        return tokens
    }
}
