import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { OnlineUserService } from '../services/online-user.service'
import { NotificationService } from '../services/notification.service'
import { NotificationPublisherService } from '../publisher/notification.publisher.service'

@WebSocketGateway()
export class NotificationGateway {
    @WebSocketServer()
    server: Server

    constructor(
        private readonly onlineUserService: OnlineUserService,
        private readonly notiPublisher: NotificationPublisherService
    ) {}

    async handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string
        if (userId) await this.onlineUserService.addSocket(userId, client.id)

        await this.notiPublisher.sendUnseenNotifications(userId)
    }

    async handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string
        if (userId) await this.onlineUserService.removeSocket(userId, client.id)
    }

    @SubscribeMessage('message')
    handleMessage(client: any, payload: any): string {
        return 'Hello world!'
    }
}
