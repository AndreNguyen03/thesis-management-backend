import { forwardRef, Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './providers/auth.service'
import { UsersModule } from 'src/users/users.module'
import { HashingProvider } from './providers/hashing.provider'
import { BcryptProvider } from './providers/bcrypt.provider'
import { SignInProvider } from './providers/sign-in.provider'
import { ConfigModule } from '@nestjs/config'
import jwtConfig from './config/jwt.config'
import { JwtModule } from '@nestjs/jwt'
import { GenerateTokensProvider } from './providers/generate-tokens.provider'
import { RefreshTokensProvider } from './providers/refresh-tokens.provider'
import { IssueTokensProvider } from './providers/issue-tokens.provider'
import { TokensModule } from 'src/tokens/tokens.module'
import { ForgotPasswordProvider } from './providers/forgot-password.provider'
import { ResetPasswordProvider } from './providers/reset-password.provider'
import { LogoutProvider } from './providers/logout.provider'

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        {
            provide: HashingProvider,
            useClass: BcryptProvider
        },
        SignInProvider,
        GenerateTokensProvider,
        RefreshTokensProvider,
        IssueTokensProvider,
        ForgotPasswordProvider,
        ResetPasswordProvider,
        LogoutProvider
    ],
    exports: [AuthService, HashingProvider],
    imports: [
        forwardRef(() => UsersModule),
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider()),
        TokensModule
    ]
})
export class AuthModule {}
