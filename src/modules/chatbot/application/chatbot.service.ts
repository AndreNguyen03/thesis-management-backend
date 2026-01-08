import { Injectable, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common'
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
import { GetChatbotDto } from '../dtos/get-chatbot.dto'
import { ChatIntent } from '../enums/chatbot-status.enum'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'

@Injectable()
export class ChatBotService {
    private readonly systemPrompt = `
        You are an AI assistant who knows everything about the principle of register a thesis
        at University of Information Technology - VNUHCM and relevant regulations about thesis, science research registration processing.
        Requesting information people are students of University of Information Technology - VNUHCM. Use the below context to augment what you know about topic registration. 
        The context will provide you with the most recent page from uit website that is place to publish regulations about thesis registration with students.
        If the context doesn't include the information you need, answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include.
        Format responses using markdown where applicable and don't return images.
        `
    private readonly logger = new Logger(ChatBotService.name)
    constructor(
        private readonly retrievalProvider: RetrievalProvider,
        private readonly generationProvider: GenerationProvider,
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        @Inject('ChatBotRepositoryInterface')
        private readonly chatBotRepository: ChatBotRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface
    ) {}

    // async requestChatbot(chatRequest: ChatRequestDto) {
    //     try {
    //         const { messages } = chatRequest
    //         console.log('Streaming started...')

    //         const last = messages[messages.length - 1]
    //         const latestMessage = last?.parts?.find((c) => c.type === 'text')?.text ?? ''
    //         console.log('Latest message:', latestMessage)

    //         if (!latestMessage) {
    //             throw new HttpException('No text content found in message', HttpStatus.BAD_REQUEST)
    //         }

    //         // Generate embedding
    //         let vector: number[]
    //         try {
    //             vector = await this.getEmbeddingProvider.getEmbedding(latestMessage)
    //             console.log('embedding lastmessage', vector.length)
    //         } catch (err) {
    //             console.error('Embedding error:', err)
    //             throw new HttpException(
    //                 {
    //                     error: 'Embedding generation failed',
    //                     details: err.message
    //                 },
    //                 HttpStatus.INTERNAL_SERVER_ERROR
    //             )
    //         }

    //         // Query database for similar docs
    //         let documents: any[] = []
    //         try {
    //             documents = await this.retrievalProvider.searchSimilarDocuments(vector)
    //         } catch (err) {
    //             console.error('❌ Database query error:', err)
    //             throw new HttpException(
    //                 {
    //                     error: 'Database query failed',
    //                     details: err.message
    //                 },
    //                 HttpStatus.INTERNAL_SERVER_ERROR
    //             )
    //         }

    //         // ✅ Build retrieval context
    //         const context = documents.map((doc) => doc.text).join('\n\n')

    //         const fullSystemPrompt = `
    //             ${this.systemPrompt}
    //             _________
    //             START CONTEXT
    //             ${context}
    //             END CONTEXT
    //             __________
    //             QUESTION: ${latestMessage}
    //             __________
    //         `

    //         // ✅ Stream AI response
    //         try {
    //             console.log('Streaming AI response...')
    //             return await this.generationProvider.streamAIResponse(fullSystemPrompt, messages)
    //         } catch (err) {
    //             console.error('AI streaming error:', err)
    //             throw new HttpException(
    //                 {
    //                     error: 'AI streaming failed',
    //                     details: err.message
    //                 },
    //                 HttpStatus.INTERNAL_SERVER_ERROR
    //             )
    //         }
    //     } catch (error) {
    //         console.error('Error processing chat:', error)
    //         if (error instanceof HttpException) {
    //             throw error
    //         }
    //         throw new HttpException('Error processing chat', HttpStatus.INTERNAL_SERVER_ERROR)
    //     }
    // }

    async requestChatbot(chatRequest: ChatRequestDto) {
        try {
            this.logger.log('🚀 Chat request started')

            const { messages } = chatRequest
            this.logger.debug(`📨 Total messages: ${messages.length}`)

            const last = messages[messages.length - 1]
            const latestMessage = last?.parts?.find((c) => c.type === 'text')?.text?.trim() ?? ''

            this.logger.log(`👤 User message: "${latestMessage}"`)

            if (!latestMessage) {
                this.logger.warn('⚠️ Empty user message')
                throw new HttpException('No text content found in message', HttpStatus.BAD_REQUEST)
            }

            // 1️⃣ Detect intent
            this.logger.log('🧠 Detecting intent...')
            const intent = await this.detectIntent(latestMessage)
            this.logger.log(`🎯 Detected intent: ${intent}`)

            // 2️⃣ Build context
            this.logger.log(`📚 Building context for intent=${intent}`)
            const context = await this.buildContextByIntent(intent, latestMessage)
            this.logger.debug(`📄 Context length=${context.length}`)

            if (!context) {
                this.logger.warn(`⚠️ Empty context for intent=${intent}`)
            }

            // 3️⃣ Build prompt
            const prompt = this.buildPromptByIntent({
                intent,
                context,
                question: latestMessage
            })

            this.logger.debug(`📝 Prompt built | length=${prompt.length} | preview="${prompt.substring(0, 150)}..."`)

            // 4️⃣ Stream AI response
            this.logger.log('📡 Streaming AI response...')
            return await this.generationProvider.streamAIResponse(prompt, messages)
        } catch (error) {
            this.logger.error(
                '❌ Error processing chatbot request',
                error instanceof Error ? error.stack : String(error)
            )

            if (error instanceof HttpException) throw error
            throw new HttpException('Error processing chat', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    // tạo mới
    async buildKnowledgeDB(userId: string, buildKnowledgeDB: BuildKnowledgeDB): Promise<KnowledgeSource[]> {
        console.log('Building Knowledge DB with documents:', buildKnowledgeDB.knowledgeDocuments)
        return this.retrievalProvider.buildKnowledgeDocuments(userId, buildKnowledgeDB)
    }
    public async getChatBotEnabledVersion(): Promise<GetChatbotDto | null> {
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
    public async updateSuggestionFromChatbot(
        versionId: string,
        suggestionId: string,
        newContent: string
    ): Promise<number | null> {
        return this.chatBotRepository.updateSuggestionFromChatbotVersion(versionId, suggestionId, newContent)
    }
    public async deleteChatbotVersion(id: string) {
        return this.chatBotRepository.softDelete(id)
    }

    private buildIntentPrompt(message: string): string {
        return `
Bạn là hệ thống PHÂN LOẠI Ý ĐỊNH (intent) cho chatbot học thuật của Trường Đại học Công nghệ Thông tin – ĐHQG-HCM.

NHIỆM VỤ:
- Phân loại câu hỏi của người dùng vào MỘT trong các INTENT bên dưới.
- CHỈ trả về TÊN INTENT.
- KHÔNG giải thích.
- KHÔNG thêm ký tự khác.

DANH SÁCH INTENT:
- LECTURER_RECOMMEND: hỏi về giảng viên, thầy/cô, người hướng dẫn, hướng nghiên cứu, ai phù hợp hướng nào
- TOPIC_SEARCH: hỏi về đề tài, chủ đề nghiên cứu, khóa luận, luận văn
- PROCESS_QA: hỏi về quy trình, thủ tục, đăng ký, quy định, thời hạn
- GENERAL_CHAT: chào hỏi, trò chuyện chung, hoặc không liên quan học thuật

VÍ DỤ:
"Có giảng viên nào nghiên cứu NLP không?"
→ LECTURER_RECOMMEND

"Em muốn tìm đề tài về Blockchain"
→ TOPIC_SEARCH

"Quy trình đăng ký khóa luận như thế nào?"
→ PROCESS_QA

"Chào bạn"
→ GENERAL_CHAT

CÂU HỎI NGƯỜI DÙNG:
"${message}"
`
    }

    private async detectIntent(message: string): Promise<ChatIntent> {
        const prompt = this.buildIntentPrompt(message)

        const raw = await this.generationProvider.generateOnce(prompt)

        const intent = raw.trim().toUpperCase()

        if (Object.values(ChatIntent).includes(intent as ChatIntent)) {
            return intent as ChatIntent
        }

        return ChatIntent.GENERAL_CHAT
    }

    private buildPromptByIntent(params: { intent: ChatIntent; context: string; question: string }) {
        const { intent, context, question } = params

        const noContextRule = `
QUY TẮC BẮT BUỘC:
- Chỉ sử dụng thông tin trong phần "DỮ LIỆU"
- Nếu DỮ LIỆU rỗng, không liên quan, hoặc không đủ để trả lời
  → hãy trả lời CHÍNH XÁC:
  "Hiện tại hệ thống chưa có dữ liệu phù hợp để trả lời câu hỏi này."
- KHÔNG suy đoán, KHÔNG tự bịa thêm thông tin
`

        switch (intent) {
            case ChatIntent.LECTURER_RECOMMEND:
                return `
Bạn là trợ lý học thuật.

NHIỆM VỤ:
Gợi ý giảng viên phù hợp với nhu cầu nghiên cứu của sinh viên.

${noContextRule}

YÊU CẦU TRẢ LỜI:
- Nếu có dữ liệu phù hợp:
  + Liệt kê giảng viên
  + Giải thích vì sao phù hợp với câu hỏi
- Trả lời bằng tiếng Việt, văn phong học thuật, rõ ràng

DỮ LIỆU:
${context || '(Không có dữ liệu)'}

CÂU HỎI:
${question}
`

            case ChatIntent.TOPIC_SEARCH:
                return `
Bạn là trợ lý học thuật.

NHIỆM VỤ:
Gợi ý đề tài nghiên cứu phù hợp cho sinh viên.

${noContextRule}

YÊU CẦU TRẢ LỜI:
- Chỉ đề xuất đề tài nếu dữ liệu đủ liên quan
- Không bịa xu hướng hoặc đề tài ngoài dữ liệu

DỮ LIỆU:
${context || '(Không có dữ liệu)'}

CÂU HỎI:
${question}
`

            case ChatIntent.PROCESS_QA:
                return `
${this.systemPrompt}

${noContextRule}

DỮ LIỆU THAM KHẢO:
${context || '(Không có dữ liệu)'}

CÂU HỎI:
${question}
`

            default:
                return `
Bạn là trợ lý AI thân thiện.

QUY TẮC:
- Nếu không đủ thông tin để trả lời câu hỏi
  → hãy nói rõ là không có dữ liệu phù hợp

CÂU HỎI:
${question}
`
        }
    }

    private async buildContextByIntent(intent: ChatIntent, question: string): Promise<string> {
        switch (intent) {
            case ChatIntent.LECTURER_RECOMMEND:
                return this.buildLecturerContext(question)

            // case ChatIntent.TOPIC_SEARCH:
            //     return this.buildTopicContext(question)

            case ChatIntent.PROCESS_QA:
                return this.buildProcessContext(question)

            default:
                return ''
        }
    }

    private async buildLecturerContext(question: string): Promise<string> {
        // Embed câu hỏi
        const vector = await this.getEmbeddingProvider.getEmbedding(question)

        // Vector search lecturers
        const points = await this.retrievalProvider.searchCollection({
            collection: 'lecturers',
            vector,
            limit: 5
        })

        if (!points.length || !points) return ''

        // Build context
        return points
            .map(
                (p) => `
Giảng viên: ${p.payload?.title} ${p.payload?.fullName}
Khoa: ${p.payload?.faculty}
Hướng nghiên cứu: ${(p.payload?.researchInterests as string[]).join(', ')}
Lĩnh vực quan tâm: ${(p.payload?.areaInterest as string[]).join(', ')}
Tiểu sử: ${p.payload?.bio}`
            )
            .join('\n\n')
    }

    // private async buildTopicContext(question: string): Promise<string> {
    //     const vector = await this.getEmbeddingProvider.getEmbedding(question)

    //     const docs = await this.retrievalProvider.searchInCollection('topics', vector, 5)

    //     return docs.map((d) => d.text).join('\n\n')
    // }

    private async buildProcessContext(question: string): Promise<string> {
        const vector = await this.getEmbeddingProvider.getEmbedding(question)

        const docs = await this.retrievalProvider.searchSimilarDocuments(vector)

        return docs.map((d) => d.text).join('\n\n')
    }
}
