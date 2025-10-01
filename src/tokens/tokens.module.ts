import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UserToken, UserTokenSchema } from './schemas/token.schema'
import { UserTokenRepository } from './repository/impl/user-tokens.repository'
import { UserTokensService } from './application/tokens.service'

@Module({
    imports: [MongooseModule.forFeature([{ name: UserToken.name, schema: UserTokenSchema }])],
    providers: [UserTokenRepository, UserTokensService],
    exports: [UserTokenRepository, UserTokensService] // để AuthModule hoặc UsersModule dùng
})
export class TokensModule {}
