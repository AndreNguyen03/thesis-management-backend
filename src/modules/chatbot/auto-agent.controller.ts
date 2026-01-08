// src/modules/chatbot/auto-agent.controller.ts
import { Controller, Post, Body, Get, Res } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AutoAgentService } from './application/auto-agent.service'
import { ChatAgentRequestDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Response } from 'express'

@ApiTags('AI Agent')
@Controller('chatbot-agent')
export class AutoAgentController {
    constructor(private readonly agentService: AutoAgentService) {}

    @Post('chat')
    @Auth(AuthType.None)
    @ApiOperation({ summary: 'Chat với AI Agent - Tự động chọn tool' })
    async chat(@Body() dto: ChatAgentRequestDto) {
        return await this.agentService.chat(dto.message, dto.chatHistory || [])
    }

    @Post('stream-chat')
    @Auth(AuthType.None)
    @ApiOperation({ summary: 'Chat với AI Agent với streaming response' })
    async streamChat(@Body() dto: ChatAgentRequestDto, @Res() res: Response) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.flushHeaders()

        try {
            const stream = this.agentService.streamChat(dto.message, dto.chatHistory || [])

            for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
            }

            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
            res.end()
        } catch (error) {
            console.error('❌ Stream error:', error)
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
            res.end()
        }
    }
    @Get('tools')
    @ApiOperation({ summary: 'Xem danh sách tools có sẵn' })
    getTools() {
        return {
            tools: [
                {
                    name: 'search_topics',
                    description: 'Tìm kiếm đề tài khóa luận',
                    usage: 'Khi người dùng hỏi về đề tài'
                },
                {
                    name: 'search_documents',
                    description: 'Tìm kiếm tài liệu, quy trình',
                    usage: 'Khi người dùng hỏi về quy định, hướng dẫn'
                },
                {
                    name: 'search_lecturers',
                    description: 'Tìm kiếm giảng viên',
                    usage: 'Khi người dùng hỏi về giảng viên hướng dẫn'
                }
            ]
        }
    }
}
