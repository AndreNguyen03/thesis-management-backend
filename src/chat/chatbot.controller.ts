import { Controller, Post, Body, Res, Sse, MessageEvent, HttpCode, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { ChatBotService } from './application/chatbot.service'
import { ChatRequestDto } from './dtos'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { map } from 'rxjs/operators'
import { Observable, from } from 'rxjs'
@Controller('chatbot')
export class ChatController {
    constructor(private readonly chatBotService: ChatBotService) {}

    @Post()
    @Auth(AuthType.None)
    async requestChatbot(@Body() chatRequest: ChatRequestDto, @Res() res: Response) {
        console.log('Received chat stream request:', chatRequest)

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
            console.error('Error during chat streaming:', error)
            // Ghi lỗi vào stream nếu có thể
            if (!res.headersSent) {
                res.status(500).send('Error streaming response')
            }
        } finally {
            // 4. Kết thúc response stream
            res.end()
        }
    }
}
