import { Controller, Post, Body, Res, Sse, MessageEvent, HttpCode, HttpStatus, Get, Param, Req } from '@nestjs/common'
import { Response } from 'express'
import { ChatBotService } from './application/chatbot.service'
import { ChatRequestDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { BuildKnowledgeDB } from './dtos/build-knowledge-db.dto'
import { UpdateChatbotDto } from './dtos/update-chatbot.dto'
import { plainToClass, plainToInstance } from 'class-transformer'
import { CreateChatbotVersionDto } from './dtos/create-chatbot-version.dto'
import { GetChatbotDto } from './dtos/get-chatbot.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
@Controller('chatbot')
export class ChatController {
    constructor(private readonly chatBotService: ChatBotService) {}

    @Post('/request')
    @Auth(AuthType.None)
    async requestChatbot(@Body() chatRequest: ChatRequestDto, @Res() res: Response) {
        // 1. Thiết lập header cho streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Transfer-Encoding', 'chunked')
        try {
            // 2. Lấy stream từ service
            const stream = await this.chatBotService.requestChatbot(chatRequest)
            // 3. Ghi từng đoạn text vào response stream
            for await (const text of stream) {
                res.write(text)
            }
        } catch (error) {
            // Ghi lỗi vào stream
            if (!res.headersSent) {
                res.status(500).send('Error streaming response')
            }
        } finally {
            // 4. Kết thúc response stream
            res.end()
        }
    }

    @Post('/build-knowledge-db')
    @Auth(AuthType.Bearer)
    async buildKnowledgeDB(@Body() buildKnowledgeDB: BuildKnowledgeDB, @Req() req: { user: ActiveUserData }) {
        try {
            const result = await this.chatBotService.buildKnowledgeDB(req.user.sub, buildKnowledgeDB)
            return { message: 'Knowledge DB built successfully' }
        } catch (error) {
            return { message: 'Error building Knowledge DB', error: error.message }
        }
    }

    @Get('/get-chatbot-version')
    @Auth(AuthType.None)
    async getChatbotVersion() {
        try {
            const chatbotversion = await this.chatBotService.getChatBotEnabledVersion()
            return plainToClass(GetChatbotDto, chatbotversion, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            })
        } catch (error) {
            return { message: 'Error getting Chatbot version', error: error.message }
        }
    }
    @Get('/update-chatbot-version/:id')
    @Auth(AuthType.None)
    async updateChatbotVersion(@Body() body: UpdateChatbotDto, @Param('id') id: string) {
        try {
            const updatedChatbot = await this.chatBotService.updateChatbotVersion(id, body)
            return plainToInstance(UpdateChatbotDto, updatedChatbot, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            })
        } catch (error) {
            return { message: 'Error getting Chatbot version', error: error.message }
        }
    }
    @Post('/')
    @Auth(AuthType.None)
    async createChatbotVersion(@Body() body: CreateChatbotVersionDto) {
        try {
            const createdChatbot = await this.chatBotService.createChatbotVersion(body)
            return plainToInstance(GetChatbotDto, createdChatbot, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            })
        } catch (error) {
            return { message: 'Error getting Chatbot version', error: error.message }
        }
    }
}
