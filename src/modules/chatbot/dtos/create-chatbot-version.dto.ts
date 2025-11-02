import { IsEmpty, IsNotEmpty, IsOptional } from 'class-validator'
import { ChatbotStatus } from '../enums/chatbot-status.enum'
import { QuerySuggestionDto } from './update-chatbot.dto'

export class CreateChatbotVersionDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    description: string
    @IsOptional() // lúc tạo hỏi áp dụng luôn chưa
    status: ChatbotStatus = ChatbotStatus.DISABLED
    @IsNotEmpty()
    knowledge_sourceIds: string[]
    @IsOptional()
    query_suggestions: QuerySuggestionDto[]
}
