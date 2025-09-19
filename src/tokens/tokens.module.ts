import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TokensService } from './providers/tokens.service'
import { UserToken, UserTokenSchema } from './schemas/token.schema'

@Module({
    imports: [MongooseModule.forFeature([{ name: UserToken.name, schema: UserTokenSchema }])],
    providers: [TokensService],
    exports: [TokensService] // để AuthModule hoặc UsersModule dùng
})
export class TokensModule {}
