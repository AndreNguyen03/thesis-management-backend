import { Injectable, Logger } from '@nestjs/common'
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    ConnectedSocket
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

export interface ProcessingProgress {
    resourceId: string
    status: 'crawling' | 'embedding' | 'completed' | 'failed'
    progress: number
    message: string
    error?: string
}

@Injectable()
@WebSocketGateway({
    namespace: '/chatbot',
    cors: {
        origin: '*',
        credentials: true
    }
})
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(ChatbotGateway.name)
    private readonly adminRoom = 'admin-knowledge-management'

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    @SubscribeMessage('join-admin')
    handleJoinAdmin(@ConnectedSocket() client: Socket) {
        client.join(this.adminRoom)
        this.logger.log(`Client ${client.id} joined admin room`)
        return { success: true }
    }

    @SubscribeMessage('leave-admin')
    handleLeaveAdmin(@ConnectedSocket() client: Socket) {
        client.leave(this.adminRoom)
        this.logger.log(`Client ${client.id} left admin room`)
        return { success: true }
    }

    // Emit progress to admin room
    emitCrawlProgress(data: ProcessingProgress) {
        this.server.to(this.adminRoom).emit('crawl:progress', data)
    }

    emitCrawlCompleted(data: ProcessingProgress) {
        this.server.to(this.adminRoom).emit('crawl:completed', data)
    }

    emitCrawlFailed(data: ProcessingProgress) {
        this.server.to(this.adminRoom).emit('crawl:failed', data)
    }

    emitEmbeddingProgress(data: ProcessingProgress) {
        this.server.to(this.adminRoom).emit('embedding:progress', data)
    }

    emitEmbeddingCompleted(data: ProcessingProgress) {
        this.server.to(this.adminRoom).emit('embedding:completed', data)
    }
}
