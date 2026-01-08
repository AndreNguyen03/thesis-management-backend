// src/modules/chatbot/auto-agent.controller.ts
import { Controller, Post, Body, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AutoAgentService } from './application/auto-agent.service'
import { ChatAgentRequestDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'

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
    async streamChat(@Body() dto: ChatAgentRequestDto) {
        const stream = this.agentService.streamChat(dto.message, dto.chatHistory || [])
        return stream
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
