import { BadRequestException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@Injectable()
@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server
    constructor(private jwtService: JwtService) {}
    onlineUsers = new Map<string, string>()
    async handleConnection(client: Socket) {
        try {
            // 1. Lấy token từ handshake (Header hoặc Query)
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization

            if (!token) throw new BadRequestException('Unauthorized')

            // 2. Verify Token (Logic auth của bạn)
            const payload = this.jwtService.verify(token)
            if (!payload) {
                throw new BadRequestException('Unauthorized')
            }
            const userId = payload.sub
            this.onlineUsers.set(userId, client.id)
            this.server.emit('online-users', Array.from(this.onlineUsers.keys()))
            console.log(`Client ${client.id} authenticated as User ${userId}`)
            // 3. Join vào room riêng của User
            const userRoom = `user_${userId}`
            await client.join(userRoom)

            console.log(`Client ${client.id} joined room ${userRoom}`)
        } catch (error) {
            console.log('Connection rejected:', error.message)
            client.disconnect()
        }
    }
    handleDisconnect(client: Socket) {
        console.log(`Client ${client.id} disconnected`)
        this.onlineUsers.delete(client.id)
        this.server.emit('online-users', Array.from(this.onlineUsers.keys()))
    }

    sendToUser(userId: string, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data)
    }
}
