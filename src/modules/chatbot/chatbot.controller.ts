import { Controller, Post, Body, Res, Get, Param, Req, Patch, UseGuards, Delete, Query } from '@nestjs/common'
import { Response } from 'express'
import { ChatBotService } from './application/chatbot.service'
import { ChatRequestDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { BuildKnowledgeDB } from './dtos/build-knowledge-db.dto'
import { QuerySuggestionDto, UpdateChatbotDto } from './dtos/update-chatbot.dto'
import { plainToClass, plainToInstance } from 'class-transformer'
import { CreateChatbotVersionDto } from './dtos/create-chatbot-version.dto'
import { GetChatbotDto } from './dtos/get-chatbot.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
@Controller('chatbots')
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
            await this.chatBotService.buildKnowledgeDB(req.user.sub, buildKnowledgeDB)
            return { message: 'Knowledge DB built successfully' }
        } catch (error) {
            return { message: 'Error building Knowledge DB', error: error.message }
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
    @Get('/chatbot-version/enabled')
    @Auth(AuthType.Bearer)
    async getChatbotVersion() {
        const chatbotversion = await this.chatBotService.getChatBotEnabledVersion()
        return plainToClass(GetChatbotDto, chatbotversion, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    // @Get('/chatbot-version/get-all')
    // @Auth(AuthType.Bearer)
    // async getAllChatBotVersion(@Query() query: PaginationQueryDto) {
    //     try {
    //         const chatbotversion = await this.chatBotService.getAllChatbotVersions(query)
    //         return plainToClass(GetPaginatedChatbotDto, chatbotversion, {
    //             excludeExtraneousValues: true,
    //             enableImplicitConversion: true
    //         })
    //     } catch (error) {
    //         return { message: 'Error getting Chatbot version', error: error.message }
    //     }
    // }

    @Delete('/chatbot-version/:id')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async deleteChatbotVersion(@Param('id') id: string) {
        const deleted = await this.chatBotService.deleteChatbotVersion(id)
        return deleted ? { message: 'Xóa phiên bản chatbot thành công' } : { message: 'Xóa phiên bản chatbot thất bại' }
    }
    @Patch('/update-chatbot-version/:id')
    @Auth(AuthType.None)
    async updateChatbotVersion(@Body() body: UpdateChatbotDto, @Param('id') id: string) {
        try {
            const updatedChatbot = await this.chatBotService.updateChatbotVersion(id, body)
            return plainToInstance(GetChatbotDto, updatedChatbot, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            })
        } catch (error) {
            return { message: 'Error getting Chatbot version', error: error.message }
        }
    }

    @Post('/chatbot-version/:versionId/query-suggestions')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async addSuggestions(@Body() body: QuerySuggestionDto, @Param('versionId') versionId: string) {
        const numberModified = await this.chatBotService.addSuggestionsToChatbot(versionId, body)
        return { message: 'Đã thêm các đề nghị cho câu hỏi tới chatbot', numberModified }
    }

    // @Patch('/chatbot-version/:versionId/unenable-suggestion-questions')
    // @Auth(AuthType.Bearer)
    // @Roles(UserRole.ADMIN)
    // @UseGuards(RolesGuard)
    // async unenableSuggestions(@Param('versionId') versionId: string, @Body('suggestionIds') suggestionIds: string[]) {
    //     const numberModified = await this.chatBotService.unenableSuggestionsFromChatbot(versionId, suggestionIds)
    //     return { message: 'Đã xóa các đề nghị cho câu hỏi khỏi chatbot', numberModified }
    // }

    @Patch('/chatbot-version/:versionId/query-suggestions/:suggestionId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async updateSuggestion(
        @Param('versionId') versionId: string,
        @Param('suggestionId') suggestionId: string,
        @Body('newContent') newContent: string
    ) {
        const numberModified = await this.chatBotService.updateSuggestionFromChatbot(
            versionId,
            suggestionId,
            newContent
        )
        return { message: 'Đã xóa các đề nghị cho câu hỏi khỏi chatbot', numberModified }
    }

    @Delete('/chatbot-version/:versionId/query-suggestions')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async removeSuggestions(@Param('versionId') versionId: string, @Body('suggestionIds') suggestionIds: string[]) {
        const numberModified = await this.chatBotService.removeSuggestionsFromChatbot(versionId, suggestionIds)
        return { message: 'Đã xóa các đề nghị cho câu hỏi khỏi chatbot', numberModified }
    }
    //toggle status change
    @Patch('/chatbot-version/:id/toggle-suggestion-status')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @Auth(AuthType.Bearer)
    async toggleSuggestionStatus(@Param('id') id: string, @Body() body: { status: boolean; suggestionId: string }) {
        const result = await this.chatBotService.toggleSuggestionStatus(id, body.status, body.suggestionId)
        return result
            ? { message: `Đã thay đổi trạng thái chatbot thành công. ${body.status}` }
            : { message: 'Thay đổi trạng thái chatbot thất bại' }
    }
}
