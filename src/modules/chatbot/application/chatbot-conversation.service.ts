import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ChatbotConversationRepository } from '../repository/chatbot-conversation.repository'
import { AutoAgentService } from './auto-agent.service'
import mongoose from 'mongoose'
import { CreateConversationDto } from '../dtos/create-conversation.dto'
import { UpdateConversationDto } from '../dtos/update-conversation.dto'
import { SendMessageDto } from '../dtos/send-message.dto'
import { v4 as uuidv4 } from 'uuid'
import { ChatbotUserRole } from '../enums/chatbot-user-role.enum'

@Injectable()
export class ChatbotConversationService {
    constructor(
        private readonly repository: ChatbotConversationRepository,
        private readonly agentService: AutoAgentService
    ) {}

    /**
     * Tạo conversation mới
     */
    async createConversation(userId: string, dto: CreateConversationDto) {
        const conversation = await this.repository.create(new mongoose.Types.ObjectId(userId), dto.title || 'Chat mới')

        // Nếu có initialMessage, gửi luôn
        if (dto.initialMessage) {
           const message = await this.addMessage(conversation._id.toString(), userId, {
                role: 'user' as ChatbotUserRole,
                content: dto.initialMessage
            })
            // Reload conversation để có messages
            return {
                conversationId: conversation._id.toString(),
                messsage: message
            }
        }

        return { conversationId: conversation._id.toString(), messsage: null }
    }

    /**
     * Lấy danh sách conversations của user
     */
    async getConversations(userId: string, status?: 'active' | 'archived') {
        return await this.repository.findByUserId(new mongoose.Types.ObjectId(userId), status)
    }

    /**
     * Lấy chi tiết conversation
     */
    async getConversationById(conversationId: string, userId: string) {
        const conversation = await this.repository.findByIdAndUserId(
            new mongoose.Types.ObjectId(conversationId),
            new mongoose.Types.ObjectId(userId)
        )

        if (!conversation) {
            throw new NotFoundException('Không tìm thấy đoạn hội thoại')
        }

        return conversation
    }

    /**
     * Cập nhật conversation (title, status)
     */
    async updateConversation(conversationId: string, userId: string, dto: UpdateConversationDto) {
        const conversation = await this.getConversationById(conversationId, userId)
        if (!conversation) {
            throw new NotFoundException('Không tìm thấy đoạn hội thoại')
        }
        return await this.repository.update(conversationId, dto)
    }

    /**
     * Xóa conversation
     */
    async deleteConversation(conversationId: string, userId: string) {
        const conversation = await this.getConversationById(conversationId, userId)

        const deleted = await this.repository.deleteByIdAndUserId(conversationId, new mongoose.Types.ObjectId(userId))

        if (!deleted) {
            throw new NotFoundException('Failed to delete conversation')
        }

        return { success: true }
    }

    /**
     * Gửi message và nhận response từ AI (Normal mode)
     */
    async addMessage(conversationId: string, userId: string, dto: SendMessageDto) {
        const conversation = await this.getConversationById(conversationId, userId)

        // 1. Lưu user message
        const userMessageId = uuidv4()
        const newMessage = {
            id: userMessageId,
            role: dto.role,
            content: dto.content,
            topics: dto.topics,
            lecturers: dto.lecturers,
            timestamp: new Date()
        }
        await this.repository.addMessage(conversationId, newMessage)

        // 5. Auto update title nếu đây là message đầu tiên
        if (conversation.messages.length === 0) {
            const newTitle = dto.content.slice(0, 40) + (dto.content.length > 40 ? '...' : '')
            await this.repository.update(conversationId, { title: newTitle })
        }
        const updatedConversation = await conversation.save()
        return newMessage
    }

    /**
     * Stream message (cho real-time response)
     * Trả về generator để controller xử lý SSE
     */
    async *streamMessage(conversationId: string, userId: string, dto: SendMessageDto) {
        const conversation = await this.getConversationById(conversationId, userId)

        // 1. Lưu user message
        const userMessageId = uuidv4()
        await this.repository.addMessage(conversationId, {
            id: userMessageId,
            role: 'user',
            content: dto.content,
            timestamp: new Date()
        })

        // 2. Stream từ AI
        const chatHistory = conversation.messages.map((m) => ({
            role: m.role,
            content: m.content
        }))

        let fullContent = ''
        let topics: any[] | undefined

        for await (const chunk of this.agentService.streamChat(dto.content, chatHistory)) {
            fullContent += chunk
            yield chunk // Yield từng chunk
        }

        // 3. Parse topics từ fullContent nếu có markers
        const topicsMatch = fullContent.match(/__TOPICS_DATA_START__\n([\s\S]*?)\n__TOPICS_DATA_END__/)
        if (topicsMatch) {
            try {
                const topicsData = JSON.parse(topicsMatch[1])
                topics = topicsData.topics || []
                // Remove markers
                fullContent = fullContent.replace(/__TOPICS_DATA_START__[\s\S]*?__TOPICS_DATA_END__/g, '').trim()
            } catch (error) {
                console.error('Failed to parse topics:', error)
            }
        }

        // 4. Lưu assistant message vào DB
        const assistantMessageId = uuidv4()
        await this.repository.addMessage(conversationId, {
            id: assistantMessageId,
            role: 'assistant',
            content: fullContent,
            topics,
            timestamp: new Date()
        })

        // 5. Auto update title nếu cần
        if (conversation.messages.length === 0 && conversation.title === 'Chat mới') {
            const newTitle = dto.content.slice(0, 40) + (dto.content.length > 40 ? '...' : '')
            await this.repository.update(conversationId, { title: newTitle })
        }
    }
}
