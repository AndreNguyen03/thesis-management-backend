import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { ChatbotStatus } from '../enums/chatbot-status.enum'
import { Expose, Type } from 'class-transformer'

export class GetChatbotDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    description: string
    @Expose()
    status: ChatbotStatus
    // @Expose()
    // @Type(() => String)
    // knowledge_sourceIds: string[]
    @Expose()
    @Type(() => GetQuerySuggestionDto)
    query_suggestions: GetQuerySuggestionDto[]
    @Expose()
    updatedAt: Date
}
export class GetPaginatedChatbotDto extends GetPaginatedObjectDto{
    @Expose()
    @Type(() => GetChatbotDto)
    data: GetChatbotDto[]
}
export class GetQuerySuggestionDto {
    @Expose()
    _id: string

    @Expose()
    content: string
}
