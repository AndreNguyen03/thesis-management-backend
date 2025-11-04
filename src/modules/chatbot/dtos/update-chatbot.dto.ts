import { IsNotEmpty, IsOptional } from 'class-validator'
import { ChatbotStatus } from '../enums/chatbot-status.enum'

export class UpdateChatbotDto {
    @IsOptional()
    name: string
    @IsOptional()
    description: string
    @IsOptional()
    status: ChatbotStatus
    // @IsOptional()
    // knowledge_sourceIds: string[]
    @IsOptional()
    query_suggestions: QuerySuggestionDto[]
}

export class QuerySuggestionDto {
    @IsNotEmpty()
    content: string
}
