import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { CacheService } from '../../../redis/providers/cache.service'
import jwtConfig from '../../config/jwt.config'
import { REQUEST_USER_KEY } from '../../constants/auth.constants'
import { AccessTokenExpiredException, TokenInvalidException } from '../../../common/exceptions'

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService,
        @Inject(jwtConfig.KEY)
        private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>()
        const token = this.extractTokenFromHeader(request)

        if (!token) throw new TokenInvalidException()

        //  Check blacklist trong Redis
        const blacklisted = await this.cacheService.get<boolean>(`blacklist:access:${token}`)
        if (blacklisted) {
            throw new UnauthorizedException('Access token has been revoked')
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.jwtConfiguration.secret,
                audience: this.jwtConfiguration.audience,
                issuer: this.jwtConfiguration.issuer
            })

            request[REQUEST_USER_KEY] = payload
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                throw new AccessTokenExpiredException()
            }
            throw new TokenInvalidException()
        }

        return true
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [_, token] = request.headers.authorization?.split(' ') ?? []
        return token
    }
}
