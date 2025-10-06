import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    RequestTimeoutException,
    UnauthorizedException
} from '@nestjs/common'
import { SignInDto } from '../dtos/sign-in.dto'
import { HashingProvider } from '../providers/hashing.provider'
import { ActiveUserData } from '../interface/active-user-data.interface'
import { JwtService } from '@nestjs/jwt'
import { TokenProvider } from '../providers/token.provider'
import { MailService } from '../../mail/providers/mail.service'
import { CacheService } from '../../redis/providers/cache.service'
import { UserTokensService } from '../../tokens/application/tokens.service'
import { UserService } from '../../users/application/users.service'
import { TokenInvalidException, TokenNotFoundException, UserNotFoundException } from '../../common/exceptions'

@Injectable()
export class AuthService {
    constructor(
        private readonly tokenProvider: TokenProvider,
        private readonly hashingProvider: HashingProvider,
        private readonly mailService: MailService,
        private readonly cacheService: CacheService,
        private readonly userTokensService: UserTokensService,
        private readonly jwtService: JwtService,
        private readonly usersService : UserService
    ) {}


    public async signIn(signInDto: SignInDto, ipAddress: string) {
        // find user if exists
        const user = await this.usersService.findByEmail(signInDto.email)
        if (!user) throw new UserNotFoundException()
        // compare password hash
        let isEqual: boolean = false
        try {
            isEqual = await this.hashingProvider.comparePassword(signInDto.password, user.password_hash)
        } catch (error) {
            throw new RequestTimeoutException(error, {
                description: 'could not compare passwords'
            })
        }

        if (!isEqual) {
            throw new UnauthorizedException('Incorrect password')
        }

        return await this.tokenProvider.issueTokens(user, signInDto.deviceInfo, ipAddress)
    }

    public async refreshTokens(refreshToken: string) {
        return await this.tokenProvider.refreshTokens(refreshToken)
    }

    public async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email)
        if (!user) throw new UserNotFoundException()

        const token = crypto.randomUUID()
        await this.cacheService.set(
            `reset_token:${token}`,
            user._id,
            60 * 15 // TTL 2 phút
        )

        await this.mailService.sendResetPasswordMail(user, token)

        return { message: 'Reset password email has been sent' }
    }

    public async resetPassword(token: string, newPassword: string) {
        const userId = await this.cacheService.get<string>(`reset_token:${token}`)
        if (!userId) throw new TokenNotFoundException()

        const user = await this.usersService.findById(userId)
        if (!user) throw new UserNotFoundException()

        const newPasswordHash = await this.hashingProvider.hashPassword(newPassword)
        try {
            await this.usersService.updatePassword(userId, newPasswordHash)
        } catch (error) {
            throw new HttpException('Update password failed', HttpStatus.BAD_REQUEST)
        }

        // xóa token để ngăn reuse
        await this.cacheService.del(`reset_token:${token}`)

        return { message: 'Password has been reset successfully' }
    }

    public async logout(accessToken?: string, refreshToken?: string) {
        if (!accessToken || !refreshToken) {
            throw new TokenNotFoundException()
        }

        // 1. Decode access token để lấy userId & exp
        const payload = this.jwtService.decode(accessToken) as ActiveUserData & { exp: number }
        if (!payload) {
            throw new TokenInvalidException()
        }

        const { sub: userId, deviceId, exp } = payload

        // 2. Invalidate refresh token trong DB
        await this.userTokensService.invalidateToken(userId, deviceId, refreshToken)

        // 3. Blacklist access token trong Redis với TTL = exp - now
        const ttl = exp - Math.floor(Date.now() / 1000)
        if (ttl > 0) {
            await this.cacheService.set(`blacklist:access:${accessToken}`, true, ttl)
        }

        return { message: 'Logout successful' }
    }
}
