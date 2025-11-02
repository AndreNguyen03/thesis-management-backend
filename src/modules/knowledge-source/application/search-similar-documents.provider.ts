import { BadGatewayException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'
import { ChatBotService } from '../../chatbot/application/chatbot.service'

@Injectable()
export class SearchSimilarDocumentsProvider {
    constructor(
        @InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>,
        @Inject(forwardRef(() => ChatBotService))
        private readonly chatbotService: ChatBotService
    ) {}
    public async searchSimilarDocuments(queryVector: number[]): Promise<KnowledgeChunk[]> {
        const chatversion = await this.chatbotService.getChatBotEnabledVersion()
        if (!chatversion) {
            throw new BadGatewayException('Phiên bản chatbot hiện tại không hợp lệ')
        }
        console.log('Searching similar documents for chat version:')
        
        const agg = [
            {
                $vectorSearch: {
                    index: 'vector_indexer',
                    path: 'plot_embedding_gemini_large',
                    queryVector: queryVector,
                    exact: true,
                    limit: 10
                }
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    sourceId: 1,
                    score: {
                        $meta: 'vectorSearchScore'
                    }
                }
            }
        ]
        // run pipeline
        const result = await this.knowledgeChunkModel.aggregate(agg)
        console.log('Search similar documents result:', result.length)
        return result
    }
}
