import { JwtService } from '@nestjs/jwt'
import { SocketWithAuth } from './type/socket.type'
import { ServerOptions } from 'socket.io'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
export class SocketIoAdapter extends IoAdapter {
    constructor(
        private readonly app: INestApplication,
        private readonly configService: ConfigService
    ) {
        super(app)
    }
    createIOServer(port: number, options?: ServerOptions): any {
        const clientUrl = this.configService.get<string>('CLIENT_URL') // hoặc lấy từ config
        const cors = {
            origin: [
                `${clientUrl}`,
                new RegExp(`^http:\\/\\/192\\.168\\.1\\.[1-9][1-9]\\d:${clientUrl}$`)
            ],
            credentials: true
        }
        const optionsWithCORS: ServerOptions = {
            ...options!,
            cors
        }
        console.log('CORS options for Socket.IO:', optionsWithCORS.cors)
        const server = super.createIOServer(port, optionsWithCORS)
        const jwtService = this.app.get(JwtService)
        server.of('/notifications').use(createTokenMiddleware(jwtService))
        return server
    }
}
const createTokenMiddleware = (jwtService: JwtService) => async (socket: SocketWithAuth, next) => {
    const token = socket.handshake.auth?.token
    try {
        const payload = await jwtService.verifyAsync(token)
        socket.payload = payload
        next()
    } catch (err) {
        next(new Error('dsdsdsdsds'))
    }
}
