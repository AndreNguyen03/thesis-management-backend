import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { OnlineUserService } from '../application/online-user.service'
import { UserVerifyInfoService } from '../providers/user-verify.info.services'
import { User } from '../../../users/schemas/users.schema'
import { SocketWithAuth } from '../../socket/type/socket.type'

@Injectable()
@WebSocketGateway({
    namespace: '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(NotificationsGateway.name)
    constructor(
        // @Inject(forwardRef(() => UserVerifyInfoService))
        private readonly userVerifyInfoService: UserVerifyInfoService,
        private readonly onlineUserService: OnlineUserService,
        @InjectQueue('notifications')
        private readonly notificationQueue: Queue
    ) {}
    onlineUsers = new Map<string, string>()
    async handleConnection(client: Socket) {
        try {
            // Lấy user đã xác thực từ socket
            const userId = this.extractUserId(client)

            console.log('Notification client connecting, extracted userId:', userId)

            if (!userId) {
                this.logger.warn(`Connection rejected: No userId found`)
                client.disconnect()
                return
            }

            this.logger.log(`User ${userId} connecting with socket ${client.id}`)
            await this.userVerifyInfoService.joinRoom(userId, client)
            await this.onlineUserService.addSocket(userId, client.id)
            client.emit('connection_success', 'Kết nối WebSocket thành công')
        } catch (error) {
            console.log('Connection rejected:', error.message)
            client.disconnect()
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = this.extractUserId(client)
        this.logger.log(`User ${userId} disconnecting socket ${client.id}`)

        if (!userId) return

        this.logger.log(`User ${userId} disconnecting socket ${client.id}`)
        await this.onlineUserService.removeSocket(userId, client.id)
        //  this.server.emit('online-users', Array.from(this.onlineUsers.keys()))
    }

    @SubscribeMessage('notification:mark-read-all')
    async handleClientMarkReadAll(@ConnectedSocket() client: Socket) {
        try {
            const userId = this.extractUserId(client)
            if (!userId) {
                client.emit('error', 'Unauthorized')
                return
            }
            await this.notificationQueue.add('mark-read-all', { userId })
        } catch (err) {
            console.error('Error enqueueing mark-read-all job:', err.message)
        }
    }

    @SubscribeMessage('notification:marked-read')
    async handleClientMarkRead(@MessageBody() data: { notificationId: string }, @ConnectedSocket() client: Socket) {
        try {
            const { notificationId } = data || {}
            if (!notificationId) {
                client.emit('error', 'Missing notificationId')
                return
            }
            await this.notificationQueue.add('mark-read', { notificationId })
        } catch (err) {
            console.error('Error enqueueing mark-read job:', err.message)
        }
    }

    notifyMarkReadAll(userId: string) {
        if (!this.server) return
        this.server.to('user_' + userId).emit('notification:mark-read-all')
    }

    notifyMarkedRead(recipientId: string, notificationId: string) {
        if (!this.server) return
        this.server.to('user_' + recipientId).emit('notification:marked-read', notificationId)
    }

    private extractUserId(client: Socket): string | null {
        // Cách 1: Từ JWT token trong auth
        const userId = client.handshake.auth?.userId
        if (userId) return userId

        // Cách 2: Từ query params (dùng cho demo/test)
        const queryUserId = client.handshake.query?.userId as string
        if (queryUserId) return queryUserId

        // Cách 3: Từ data đã set trước đó
        return client.data?.userId || null
    }
}
