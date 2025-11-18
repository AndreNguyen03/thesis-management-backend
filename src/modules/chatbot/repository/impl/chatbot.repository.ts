import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { ChatBotRepositoryInterface } from '../chatbot.repository.interface'
import { Model } from 'mongoose'
import { ChatbotVersion, QuerySuggestion } from '../../schemas/chatbot_version.schemas'
import { ChatbotStatus } from '../../enums/chatbot-status.enum'
import { QuerySuggestionDto, UpdateChatbotDto } from '../../dtos/update-chatbot.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { GetChatbotDto } from '../../dtos/get-chatbot.dto'

export class ChatBotRepository extends BaseRepositoryAbstract<ChatbotVersion> implements ChatBotRepositoryInterface {
    constructor(
        @InjectModel(ChatbotVersion.name) private readonly chatbotModel: Model<ChatbotVersion>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(chatbotModel)
    }

    async updateChatbotVersion(id: string, updateChatbotDto: UpdateChatbotDto): Promise<ChatbotVersion | null> {
        const updatedChatbot = await this.chatbotModel.findByIdAndUpdate(id, updateChatbotDto, { new: true }).exec()
        return updatedChatbot
    }
    async getChatBotEnabled(): Promise<GetChatbotDto | null> {
        // const chatBot = await this.chatbotModel.findOne({ status: ChatbotStatus.ENABLED, deleted_at: null }).exec()
        // return chatBot ? chatBot.toObject() : null
        const res = await this.chatbotModel.aggregate([
            {
                $facet: {
                    data: [{ $match: { status: ChatbotStatus.ENABLED, deleted_at: null } }],
                    query_suggestions: [
                        { $unwind: '$query_suggestions' },
                        { $match: { 'query_suggestions.enabled': true } }
                    ],
                    query_unenable_suggestions: [
                        { $unwind: '$query_suggestions' },
                        { $match: { 'query_suggestions.enabled': false } }
                    ]
                }
            }
        ])
        return {
            ...res[0].data[0],
            query_suggestions: res[0].query_suggestions.map((item) => item.query_suggestions),
            query_unenable_suggestions: res[0].query_unenable_suggestions.map((item) => item.query_suggestions)
        }
    }
    async getAllChatbotVersions(paginationQuery: PaginationQueryDto): Promise<Paginated<ChatbotVersion>> {
        return await this.paginationProvider.paginateQuery<ChatbotVersion>(paginationQuery, this.chatbotModel)
    }
    async addSuggestionsToChatbotVersion(versionId: string, addedQuestion: QuerySuggestionDto): Promise<number | null> {
        let newSuggestQuestions: QuerySuggestion[] = []
        for (const question of addedQuestion.contents) {
            const newSuggestion = new QuerySuggestion()
            newSuggestion.content = question
            newSuggestQuestions.push(newSuggestion)
        }
        const result = await this.chatbotModel
            .updateOne(
                { _id: versionId, deleted_at: null },
                { $push: { query_suggestions: { $each: newSuggestQuestions } } }
            )
            .exec()
        return result.modifiedCount
    }
    async removeSuggestionsFromChatbotVersion(versionId: string, suggestionIds: string[]): Promise<number | null> {
        const result = await this.chatbotModel
            .updateOne(
                { _id: versionId, deleted_at: null },
                { $pull: { query_suggestions: { _id: { $in: suggestionIds } } } }
            )
            .exec()
        return result.modifiedCount
    }
    async unenableSuggestionsFromChatbotVersion(versionId: string, suggestionIds: string[]): Promise<number | null> {
        const result = await this.chatbotModel.updateOne(
            { _id: versionId, deleted_at: null },
            { $set: { 'query_suggestions.$[elem].enabled': false } },
            { arrayFilters: [{ 'elem._id': { $in: suggestionIds } }] }
        )
        return result.modifiedCount
    }
    async updateSuggestionFromChatbotVersion(
        versionId: string,
        suggestionId: string,
        newContent: string
    ): Promise<number | null> 
    {
        const result = await this.chatbotModel.updateOne(
            { _id: versionId, deleted_at: null },
            { $set: { 'query_suggestions.$[elem].content': newContent } },
            { arrayFilters: [{ 'elem._id': suggestionId }] }
        )
        return result.modifiedCount
    }
}
