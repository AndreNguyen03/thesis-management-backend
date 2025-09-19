import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import jwtConfig from '../config/jwt.config'
import { User, UserDocument } from 'src/users/schemas/user.schema'
import { ActiveUserData } from '../interface/active-user-data.interface'

@Injectable()
export class GenerateTokensProvider {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(jwtConfig.KEY)
        private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
    ) {}

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

    public async generateToken(user: UserDocument, deviceId: string) {
        const [accessToken, refreshToken] = await Promise.all([
            // gen access token
            this.signToken<Partial<ActiveUserData>>(
                user._id.toString(),
                // this.jwtConfiguration.accessTokenTTL,
                60, // 1 minute for testing
                {
                    email: user.email,
                    deviceId: deviceId,
                    role: user.role
                }
            ),

            // gen refresh token
            this.signToken<Partial<ActiveUserData>>(
                user._id.toString(),
                // this.jwtConfiguration.refreshTokenTTL,
                120, // 2 minutes for testing
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
