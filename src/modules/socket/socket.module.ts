import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { SocketIoAdapter } from './socket-io.adapter'
import { ConfigModule } from '@nestjs/config'
import jwtConfig from '../../auth/config/jwt.config'

@Module({
    imports: [ConfigModule.forFeature(jwtConfig), JwtModule.registerAsync(jwtConfig.asProvider())], // Thêm config nếu cần
    providers: [SocketIoAdapter],
    exports: [SocketIoAdapter]
})
export class SocketModule {}
