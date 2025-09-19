import { Injectable } from '@nestjs/common'
import { SignInDto } from '../dtos/sign-in.dto'
import { SignInProvider } from './sign-in.provider'
import { RefreshTokensProvider } from './refresh-tokens.provider'
import { RefreshTokenDto } from '../dtos/refresh-token.dto'
import { ForgotPasswordProvider } from './forgot-password.provider'
import { ResetPasswordProvider } from './reset-password.provider'
import { LogoutProvider } from './logout.provider'

@Injectable()
export class AuthService {
    constructor(
        private readonly signInProvider: SignInProvider,
        private readonly refreshTokensProvider: RefreshTokensProvider,
        private readonly forgotPasswordProvider: ForgotPasswordProvider,
        private readonly resetPasswordProvider: ResetPasswordProvider,
        private readonly logoutProvider: LogoutProvider
    ) {}

    public async signIn(signInDto: SignInDto, ipAddress: string) {
        return await this.signInProvider.signIn(signInDto, ipAddress)
    }

    public async refreshTokens(refreshToken: RefreshTokenDto) {
        return await this.refreshTokensProvider.refreshTokens(refreshToken)
    }

    async forgotPassword(email: string) {
        return await this.forgotPasswordProvider.forgotPassword(email)
    }

    async resetPassword(token: string, newPasswword: string) {
        return await this.resetPasswordProvider.resetPassword(token, newPasswword)
    }
    
    async logout(accessToken?: string, refreshToken?: string) {
        return await this.logoutProvider.logout(accessToken, refreshToken);
    }
}
