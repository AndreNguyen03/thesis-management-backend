import { forwardRef, Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './application/auth.service'
import { UsersModule } from 'src/users/users.module'
import { HashingProvider } from './providers/hashing.provider'
import { BcryptProvider } from './providers/bcrypt.provider'
import { ConfigModule } from '@nestjs/config'
import jwtConfig from './config/jwt.config'
import { JwtModule } from '@nestjs/jwt'
import { TokensModule } from 'src/tokens/tokens.module'
import { TokenProvider } from './providers/token.provider'

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        {
            provide: HashingProvider,
            useClass: BcryptProvider
        },
        TokenProvider
    ],
    exports: [AuthService, HashingProvider, TokenProvider],
    imports: [
        forwardRef(() => UsersModule),
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider()),
        TokensModule
    ]
})
export class AuthModule {}
