// chat.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { OnlineService } from '../application/online.service'
import { Logger } from '@nestjs/common'
import { ChatService } from '../application/chat.service'
import { GroupsService } from '../application/groups.service'

@WebSocketGateway({
    namespace: '/chat',
    cors: {
        origin: '*',
        credentials: true
    }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(ChatGateway.name)

    constructor(
        private readonly onlineService: OnlineService,
        private readonly chatService: ChatService,
        private readonly groupService: GroupsService
    ) {}

    // ========== CONNECTION HANDLING ==========

    async handleConnection(client: Socket) {
        try {
            const userId = this.extractUserId(client)

            if (!userId) {
                this.logger.warn(`Connection rejected: No userId found`)
                client.disconnect()
                return
            }

            this.logger.log(`User ${userId} connecting with socket ${client.id}`)

            // 1. Lưu socket vào Redis
            await this.onlineService.addUserSocket('chat', userId, client.id)

            // 2. Join vào room cá nhân
            client.join(`user:${userId}`)

            // 3. Lấy tất cả groups mà user tham gia
            const userGroups = await this.chatService.getUserGroups(userId)
            const groupIds = userGroups.map((g) => g._id.toString())

            this.logger.log(`User ${userId} is member of ${groupIds.length} groups`)

            // 4. Cache user-groups mapping vào Redis
            await this.onlineService.setUserGroups('chat', userId, groupIds)

            // 5. Join vào tất cả group rooms
            for (const group of userGroups) {
                client.join(`group:${group._id}`)
                this.logger.log(`🟢 Socket ${client.id} joined room group:${group._id}`)
                // Cache group members vào Redis
                const memberIds = group.participants.map((id) => id.toString())
                await this.onlineService.setGroupMembers('chat', group._id.toString(), memberIds)
            }

            // 6. Emit user online đến tất cả groups
            await this.notifyGroupsUserOnline(userId, groupIds)

            this.logger.log(`User ${userId} connected successfully`)
        } catch (error) {
            this.logger.error(`Error in handleConnection: ${error.message}`)
            client.disconnect()
        }
    }

    async handleDisconnect(client: Socket) {
        try {
            const userId = this.extractUserId(client)
            this.logger.log(`User ${userId} disconnecting socket ${client.id}`)

            if (!userId) return

            this.logger.log(`User ${userId} disconnecting socket ${client.id}`)

            // 1. Remove socket khỏi Redis
            await this.onlineService.removeUserSocket('chat', userId, client.id)

            // 2. Kiểm tra user còn socket nào online không
            const isStillOnline = await this.onlineService.isUserOnline('chat', userId)

            if (!isStillOnline) {
                // User thực sự offline (tất cả sockets đã disconnect)
                this.logger.log(`User ${userId} is now offline`)

                // 3. Lấy danh sách groups của user
                const groupIds = await this.onlineService.getUserGroups('chat', userId)

                // 4. Emit user offline đến tất cả groups
                await this.notifyGroupsUserOffline(userId, groupIds)
            } else {
                this.logger.log(`User ${userId} still has other connections`)
            }
        } catch (error) {
            this.logger.error(`Error in handleDisconnect: ${error.message}`)
        }
    }

    // ========== PRIVATE METHODS ==========

    /**
     * Emit user online đến tất cả groups
     */
    private async notifyGroupsUserOnline(userId: string, groupIds: string[]): Promise<void> {
        for (const groupId of groupIds) {
            try {
                // Lấy danh sách members online trong group
                const onlineMembers = await this.onlineService.getGroupOnlineMembers('chat', groupId)

                // Emit đến tất cả members trong group
                this.server.to(`group:${groupId}`).emit('user_status_change', {
                    groupId,
                    userId,
                    status: 'online',
                    onlineUsers: onlineMembers,
                    timestamp: new Date().toISOString()
                })

                this.logger.debug(`Notified group ${groupId}: user ${userId} online`)
            } catch (error) {
                this.logger.error(`Error notifying group ${groupId}: ${error.message}`)
            }
        }
    }

    /**
     * Emit user offline đến tất cả groups
     */
    private async notifyGroupsUserOffline(userId: string, groupIds: string[]): Promise<void> {
        for (const groupId of groupIds) {
            try {
                // Lấy danh sách members còn online
                const onlineMembers = await this.onlineService.getGroupOnlineMembers('chat', groupId)

                // Emit đến tất cả members trong group
                this.server.to(`group:${groupId}`).emit('user_status_change', {
                    groupId,
                    userId,
                    status: 'offline',
                    onlineUsers: onlineMembers,
                    timestamp: new Date().toISOString()
                })

                this.logger.debug(`Notified group ${groupId}: user ${userId} offline`)
            } catch (error) {
                this.logger.error(`Error notifying group ${groupId}: ${error.message}`)
            }
        }
    }

    /**
     * Extract userId từ socket (JWT token hoặc query params)
     */
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

    // ========== WEBSOCKET EVENTS ==========

    /**
     * Client request online status của một group
     */
    @SubscribeMessage('get_group_online_users')
    async handleGetGroupOnlineUsers(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
        try {
            const userId = this.extractUserId(client)
            if (!userId) {
                return { success: false, error: 'Unauthorized' }
            }

            const isMember = await this.chatService.isUserInGroup(data.groupId, userId)
            if (!isMember) {
                return { success: false, error: 'You are not a member of this group' }
            }

            const onlineMembers = await this.onlineService.getGroupOnlineMembers('chat', data.groupId)
            const allMembers = await this.onlineService.getGroupMembers('chat', data.groupId)

            return {
                success: true,
                groupId: data.groupId,
                onlineUsers: onlineMembers,
                totalMembers: allMembers.length,
                onlineCount: onlineMembers.length
            }
        } catch (error) {
            this.logger.error(`Error getting group online users: ${error.message}`)
            return { success: false, error: 'Failed to get online users' }
        }
    }

    /**
     * Gửi tin nhắn trong group (Messenger-style)
     * - FE: optimistic (sending)
     * - BE: save DB
     * - BE: emit lại message kèm clientTempId
     * - FE: replace → delivered
     */
    @SubscribeMessage('send_group_message')
    async handleSendGroupMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            groupId: string
            content: string
            type?: 'text' | 'file' | 'image'
            attachments?: string[]
            replyTo?: string
            clientTempId?: string
        }
    ) {
        try {
            const senderId = this.extractUserId(client)

            if (!senderId) {
                this.logger.error(`❌ No senderId`)
                return { success: false }
            }

            const message = await this.chatService.saveMessage({
                groupId: data.groupId,
                senderId,
                content: data.content,
                type: data.type,
                attachments: data.attachments,
                replyTo: data.replyTo
            })

            const plain = message.toObject()

            const payload = {
                ...plain,
                _id: plain._id.toString(),
                groupId: plain.groupId?.toString(),
                senderId: plain.senderId?.toString(),
                clientTempId: data.clientTempId,
                status: 'delivered'
            }

            this.server.to(`group:${data.groupId}`).emit('new_group_message', payload)

            return payload
        } catch (error) {
            this.logger.error(`💥 Error in send_group_message`)
            this.logger.error(error.stack || error)
            return { success: false }
        }
    }

    @SubscribeMessage('group_message_seen')
    async handleGroupMessageSeen(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
        try {
            const userId = this.extractUserId(client)
            if (!userId) return { success: false }

            const groupId = data.groupId
            const seenAt = new Date()

            // 1️⃣ Cập nhật lastSeenAtByUser trong DB
            await this.chatService.updateGroupLastSeen(groupId, userId, seenAt)

            // 3️⃣ Emit đến tất cả member khác trong group
            client.to(`group:${groupId}`).emit('group_message_seen', {
                groupId,
                userId,
                seenAt: seenAt.toISOString()
            })

            return { success: true }
        } catch (error) {
            this.logger.error(`Error in handleGroupMessageSeen: ${error.message}`)
            return { success: false }
        }
    }

    /**
     * Typing indicator
     */
    @SubscribeMessage('typing')
    async handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string; isTyping: boolean }) {
        const userId = this.extractUserId(client)

        // Emit đến tất cả members trong group (trừ sender)
        client.to(`group:${data.groupId}`).emit('user_typing', {
            groupId: data.groupId,
            userId,
            isTyping: data.isTyping
        })
    }
}
