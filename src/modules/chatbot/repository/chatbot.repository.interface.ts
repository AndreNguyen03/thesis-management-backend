import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetChatbotDto } from '../dtos/get-chatbot.dto'
import { QuerySuggestionDto, UpdateChatbotDto } from '../dtos/update-chatbot.dto'
import { ChatbotVersion } from '../schemas/chatbot_version.schemas'

export interface ChatBotRepositoryInterface extends BaseRepositoryInterface<ChatbotVersion> {
    getChatBotEnabled(): Promise<GetChatbotDto | null>
    getAllChatbotVersions(paginationQuery: PaginationQueryDto): Promise<Paginated<ChatbotVersion>>
    updateChatbotVersion(id: string, updateChatbotDto: UpdateChatbotDto): Promise<ChatbotVersion | null>
    addSuggestionsToChatbotVersion(versionId: string, addedQuestion: QuerySuggestionDto): Promise<number | null>
    removeSuggestionsFromChatbotVersion(versionId: string, suggestionIds: string[]): Promise<number | null>
    unenableSuggestionsFromChatbotVersion(versionId: string, suggestionIds: string[]): Promise<number | null>
    updateSuggestionFromChatbotVersion(
        versionId: string,
        suggestionId: string,
        newContent: string
    ): Promise<number | null>
}
