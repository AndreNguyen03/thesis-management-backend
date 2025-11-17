import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common'
import { ChatRequestDto } from '../dtos'
import { BuildKnowledgeDB } from '../dtos/build-knowledge-db.dto'
import { RetrievalProvider } from './retrieval.provider'
import { GetEmbeddingProvider } from './get-embedding.provider'
import { ChatBotRepositoryInterface } from '../repository/chatbot.repository.interface'
import { GenerationProvider } from './generation.provider'
import { ChatbotVersion } from '../schemas/chatbot_version.schemas'
import { QuerySuggestionDto, UpdateChatbotDto } from '../dtos/update-chatbot.dto'
import { CreateChatbotVersionDto } from '../dtos/create-chatbot-version.dto'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class ChatBotService {
    private readonly systemPrompt = `
        You are an AI assistant who knows everything about the principle of register a thesis
         at University of Information Technology - VNUHCM and relevant regulations about thesis,
        People who request information are students of University of Information Technology - VNUHCM.
        project1, project2 registration, science research. Use the below context to augment what you know about topic registration. 
        The context will provide you with the most recent page from uit website that is place to publish regulations about thesis registration with students.
        If the context doesn't include the information you need, answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include.
        Format responses using markdown where applicable and don't return images.

        `
    constructor(
        private readonly retrievalProvider: RetrievalProvider,
        private readonly generationProvider: GenerationProvider,
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        @Inject('ChatBotRepositoryInterface')
        private readonly chatBotRepository: ChatBotRepositoryInterface
    ) {}

    async requestChatbot(chatRequest: ChatRequestDto) {
        try {
            const { messages } = chatRequest
            console.log('Streaming started...')

            const last = messages[messages.length - 1]
            const latestMessage = last?.parts?.find((c) => c.type === 'text')?.text ?? ''
            console.log('Latest message:', latestMessage)
            if (!latestMessage) {
                throw new HttpException('No text content found in message', HttpStatus.BAD_REQUEST)
            }

            // Generate embedding
            let vector: number[]
            try {
                vector = await this.getEmbeddingProvider.getEmbedding(latestMessage)
                console.log('embedding lastmessage', vector.length)
            } catch (err) {
                console.error('Embedding error:', err)
                throw new HttpException(
                    {
                        error: 'Embedding generation failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }

            // Query database for similar docs
            let documents: any[] = []
            try {
                documents = await this.retrievalProvider.searchSimilarDocuments(vector)
            } catch (err) {
                console.error('❌ Database query error:', err)
                throw new HttpException(
                    {
                        error: 'Database query failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }

            // ✅ Build retrieval context
            const context = documents.map((doc) => doc.text).join('\n\n')

            const fullSystemPrompt = `
                ${this.systemPrompt}
                _________
                START CONTEXT
                ${context}
                END CONTEXT
                __________
                QUESTION: ${latestMessage}
                __________
            `

            // ✅ Stream AI response
            try {
                console.log('Streaming AI response...')
                return await this.generationProvider.streamAIResponse(fullSystemPrompt, messages)
            } catch (err) {
                console.error('AI streaming error:', err)
                throw new HttpException(
                    {
                        error: 'AI streaming failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }
        } catch (error) {
            console.error('Error processing chat:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw new HttpException('Error processing chat', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    // tạo mới
    async buildKnowledgeDB(userId: string, buildKnowledgeDB: BuildKnowledgeDB): Promise<KnowledgeSource[]> {
        console.log('Building Knowledge DB with documents:', buildKnowledgeDB.knowledgeDocuments)
        return this.retrievalProvider.buildKnowledgeDocuments(userId, buildKnowledgeDB)
    }
    public async getChatBotEnabledVersion(): Promise<ChatbotVersion | null> {
        const chatBot = await this.chatBotRepository.getChatBotEnabled()
        return chatBot
    }
    public async getAllChatbotVersions(paginationQuery: PaginationQueryDto): Promise<Paginated<ChatbotVersion>> {
        const chatbotVersions = await this.chatBotRepository.getAllChatbotVersions(paginationQuery)
        return chatbotVersions
    }
    public async updateChatbotVersion(id: string, updateChatbotDto: UpdateChatbotDto): Promise<ChatbotVersion | null> {
        return this.chatBotRepository.updateChatbotVersion(id, updateChatbotDto)
    }
    public async createChatbotVersion(createChatbotDto: CreateChatbotVersionDto): Promise<ChatbotVersion> {
        return this.chatBotRepository.create(createChatbotDto)
    }
    public async addSuggestionsToChatbot(versionId: string, addedQuestion: QuerySuggestionDto): Promise<number | null> {
        return this.chatBotRepository.addSuggestionsToChatbotVersion(versionId, addedQuestion)
    }
    public async removeSuggestionsFromChatbot(versionId: string, suggestionIds: string[]): Promise<number | null> {
        return this.chatBotRepository.removeSuggestionsFromChatbotVersion(versionId, suggestionIds)
    }

    public async unenableSuggestionsFromChatbot(versionId: string, suggestionIds: string[]): Promise<number | null> {
        return this.chatBotRepository.unenableSuggestionsFromChatbotVersion(versionId, suggestionIds)
    }
    public async deleteChatbotVersion(id: string) {
        return this.chatBotRepository.softDelete(id)
    }
}
