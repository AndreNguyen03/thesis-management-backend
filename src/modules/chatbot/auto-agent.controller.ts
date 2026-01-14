// src/modules/chatbot/auto-agent.controller.ts
import { Controller, Post, Body, Get, Res, Req } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AutoAgentService } from './application/auto-agent.service'
import { ChatAgentRequestDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Response } from 'express'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@ApiTags('AI Agent')
@Controller('chatbot-agent')
export class AutoAgentController {
    constructor(private readonly agentService: AutoAgentService) {}

    @Post('chat')
    @Auth(AuthType.None)
    @ApiOperation({ summary: 'Chat với AI Agent - Tự động chọn tool' })
    async chat(@Body() dto: ChatAgentRequestDto) {
        return await this.agentService.chat(dto.message, dto.chatHistory || [], dto.userId)
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
            const stream = this.agentService.streamChat(dto.message, dto.chatHistory || [], dto.userId)

            for await (const chunk of stream) {
                res.write(chunk+ '\n')
            }

            res.end()
        } catch (error) {
            console.error('❌ Stream error:', error)
            res.write(JSON.stringify({ type: 'error', error: error.message }) + '\n')
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
                },
                {
                    name: 'profile_matching_lecturer_search_tool',
                    description: 'Gợi ý giảng viên phù hợp dựa trên hồ sơ người dùng',
                    usage: 'Khi người dùng muốn tìm giảng viên phù hợp với hồ sơ của họ'
                }
            ]
        }
    }
}
