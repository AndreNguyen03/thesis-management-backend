import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common'
import { ChatbotConversationService } from './application/chatbot-conversation.service'
import { ConversationMessage, GetConversationsDto, GetConversationsQuery } from './dtos/get-conversations-query.dto'
import { CreateConversationDto } from './dtos/create-conversation.dto'
import { UpdateConversationDto } from './dtos/update-conversation.dto'
import { SendMessageDto } from './dtos/send-message.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { plainToInstance } from 'class-transformer'

@Controller('chatbot/conversations')
export class ChatbotConversationController {
    constructor(private readonly conversationService: ChatbotConversationService) {}

    /**
     * POST /api/chatbot/conversations/:id/messages
     * Gửi message và nhận response (Normal mode)
     */
    @Post(':id/messages')
    @HttpCode(HttpStatus.OK)
    async addMessage(
        @Req() req: { user: ActiveUserData },
        @Param('id') conversationId: string,
        @Body() dto: SendMessageDto
    ) {
        const userId = req.user.sub
        const result = await this.conversationService.addMessage(conversationId, userId, dto)
        return plainToInstance(ConversationMessage, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    /**
     * GET /api/chatbot/conversations
     * Lấy danh sách conversations của user
     */
    @Get()
    async getConversations(@Req() req: { user: ActiveUserData }, @Query() query: GetConversationsQuery) {
        const userId = req.user.sub
        const conversations = await this.conversationService.getConversations(userId, query.status)
        return plainToInstance(GetConversationsDto, conversations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    /**
     * POST /api/chatbot/conversations
     * Tạo conversation mới
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createConversation(@Req() req: { user: ActiveUserData }, @Body() dto: CreateConversationDto) {
        const userId = req.user.sub
        const result = await this.conversationService.createConversation(userId, dto)
        return { conversationId: result?.conversationId, messsage: result?.messsage }
    }

    /**
     * GET /api/chatbot/conversations/:id
     * Lấy chi tiết một conversation
     */
    @Get(':id')
    async getConversationById(@Req() req: { user: ActiveUserData }, @Param('id') conversationId: string) {
        const userId = req.user.sub
        const conversation = await this.conversationService.getConversationById(conversationId, userId)
        return plainToInstance(GetConversationsDto, conversation, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    /**
     * PATCH /api/chatbot/conversations/:id
     * Cập nhật conversation (title, status)
     */
    @Patch(':id')
    async updateConversation(@Req() req: any, @Param('id') conversationId: string, @Body() dto: UpdateConversationDto) {
        const userId = req.user.sub
        const conversation = await this.conversationService.updateConversation(conversationId, userId, dto)
        return {
            statusCode: HttpStatus.OK,
            message: 'Conversation updated successfully',
            data: conversation
        }
    }

    /**
     * DELETE /api/chatbot/conversations/:id
     * Xóa conversation
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteConversation(@Req() req: { user: ActiveUserData }, @Param('id') conversationId: string) {
        const userId = req.user.sub
        const result = await this.conversationService.deleteConversation(conversationId, userId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Conversation deleted successfully',
            data: result
        }
    }
}
