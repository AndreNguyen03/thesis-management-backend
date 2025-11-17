import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ChatbotStatus } from '../enums/chatbot-status.enum'

export class UpdateChatbotDto {
    @IsOptional()
    name: string
    @IsOptional()
    description: string
    @IsOptional()
    status: ChatbotStatus
}

export class QuerySuggestionDto {
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    contents: string[]
}
