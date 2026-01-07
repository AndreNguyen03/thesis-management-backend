import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ChatbotStatus } from '../enums/chatbot-status.enum'
import { Type } from 'class-transformer'

export class UpdateChatbotDto {
    @IsOptional()
    name: string
    @IsOptional()
    description: string
    @IsOptional()
    status: ChatbotStatus
}
export class CreateSuggestion {
    @IsNotEmpty()
    @IsString()
    content: string
    @IsNotEmpty()
    @IsBoolean()
    enabled: boolean
}
export class QuerySuggestionDto {
    @IsNotEmpty()
    @IsArray()
    @Type(() => CreateSuggestion)
    suggestions: CreateSuggestion[]
}
