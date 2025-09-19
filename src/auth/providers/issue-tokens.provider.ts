import { Inject } from '@nestjs/common'
import { User, UserDocument } from '../../users/schemas/user.schema'
import { GenerateTokensProvider } from './generate-tokens.provider'
import jwtConfig from '../config/jwt.config'
import { ConfigType } from '@nestjs/config'
import { TokensService } from 'src/tokens/providers/tokens.service'
export class IssueTokensProvider {
    constructor(
        private readonly generateTokensProvider: GenerateTokensProvider,
        @Inject(jwtConfig.KEY)
        private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
        private readonly tokensService: TokensService
    ) {}

    public async issueTokens(user: UserDocument, deviceInfo: string, ipAddress: string) {
        // 1. Sinh deviceId cho session
        const deviceId = crypto.randomUUID()

        // 2. Generate tokens
        const tokens = await this.generateTokensProvider.generateToken(user, deviceId)

        // 3. Lưu refresh token vào DB
        await this.tokensService.createToken({
            userId: user._id,
            refreshToken: tokens.refreshToken,
            deviceId,
            deviceInfo,
            ipAddress,
            expiresAt: new Date(Date.now() + this.jwtConfiguration.refreshTokenTTL * 1000)
        })

        // 4. Trả về tokens + deviceId cho FE
        return tokens
    }
}
