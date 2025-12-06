import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { OnlineUserService } from '../application/online-user.service'
import { UserVerifyInfoService } from '../providers/user-verify.info.services'
import { User } from '../../../users/schemas/users.schema'
import { SocketWithAuth } from '../../socket/type/socket.type'

@Injectable()
@WebSocketGateway({
    namespace: 'notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server
    constructor(
        private readonly userVerifyInfoService: UserVerifyInfoService,
        private readonly onlineUserService: OnlineUserService,
    ) {}
    onlineUsers = new Map<string, string>()
    async handleConnection(client: SocketWithAuth) {
        try {
            // Lấy user đã xác thực từ socket
            const payload = client.payload
            if (!payload) {
                client.disconnect()
                throw new BadRequestException('Unauthorized')
            }
            const userId = payload.sub
         
            await this.userVerifyInfoService.joinRoom(new User(), client)
            await this.onlineUserService.addSocket(userId, client.id)
            client.emit('connection_success', 'Kết nối WebSocket thành công')
        } catch (error) {
            console.log('Connection rejected:', error.message)
            client.disconnect()
        }
    }
    async handleDisconnect(client: Socket) {
        console.log(`Client ${client.id} disconnected`)
        // this.onlineUsers.delete(client.id)
        const userId = client.handshake.query.userId as string
        await this.onlineUserService.removeSocket(userId, client.id)
        //  this.server.emit('online-users', Array.from(this.onlineUsers.keys()))
    }
}
