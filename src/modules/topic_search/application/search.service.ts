import { Injectable, OnModuleInit, Inject, forwardRef, BadGatewayException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ConfigType } from '@nestjs/config'
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { TopicVector } from '../schemas/topic-vector.schemas'
import { googleAIConfig } from '../../../config/googleai.config'

import { StringOutputParser } from '@langchain/core/output_parsers'
import { TaskType } from '@google/generative-ai'
import { PeriodPhase } from '../../periods/schemas/period.schemas'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { TopicStatus } from '../../topics/enum'
import { PeriodsService } from '../../periods/application/periods.service'
import { SearchRegisteringTopicsDto, SearchTopicsInLibraryDto } from '../dtos/search.dtos'
import { TopicVectorRepositoryInterface } from '../repository/topic-vector.repository.interface'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { RequestGetTopicsInAdvanceSearchParams, RequestGetTopicsInPhaseParams } from '../../topics/dtos'
@Injectable()
export class TopicSearchService implements OnModuleInit {
    private vectorStoreRead: MongoDBAtlasVectorSearch
    private queryEmbeddings: GoogleGenerativeAIEmbeddings
    constructor(
        @InjectModel(TopicVector.name)
        private readonly topicVectorModel: Model<TopicVector>,
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfiguration: ConfigType<typeof googleAIConfig>,
        private readonly periodsService: PeriodsService,
        @Inject('TopicVectorRepositoryInterface')
        private readonly topicVectorRepoInterface: TopicVectorRepositoryInterface,
    ) {}

    async onModuleInit() {
        try {
            this.queryEmbeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'models/text-embedding-004',
                apiKey: this.googleAIConfiguration.apiKey,
                taskType: TaskType.RETRIEVAL_QUERY // Mode Query chuẩn
            })
            const collection = this.topicVectorModel.db.db?.collection(this.topicVectorModel.collection.name)
            this.vectorStoreRead = new MongoDBAtlasVectorSearch(this.queryEmbeddings, {
                collection: collection as any,
                indexName: 'search_topic_vector_index',
                textKey: 'text_content',
                embeddingKey: 'embedding'
            })
            console.log('🤖 Chatbot Service đã khởi tạo Vector Store thành công!')
        } catch (error) {
            console.error('❌ Lỗi khởi tạo Chatbot Service:', error)
        }
    }

    async recommendRegisteringTopics(facultyId: string, searchTopicsDto: SearchRegisteringTopicsDto) {
        const { description, type } = searchTopicsDto
        const currPeriod = await this.periodsService.getCurrentPeriodInfo(facultyId, type)
        const cleanQuery = description.trim()
        try {
            // 2. TẠO VECTOR CHO CÂU HỎI (MANUAL EMBEDDING)
            const queryVector = await this.queryEmbeddings.embedQuery(cleanQuery)
            console.log(`Embedding thành công! Vector size: ${queryVector.length}`)

            // 3. TỰ TÌM KIẾM TRONG MONGODB (VECTOR SEARCH)
            // Tìm 5 kết quả gần nhất
            // similaritySearchVectorWithScore: Trả về [Document, Score]
            const results = await this.vectorStoreRead.similaritySearchVectorWithScore(queryVector, 5, {
                'periodInfo._id': currPeriod?._id,
                'lastStatusInPhaseHistory.phaseName': PeriodPhaseName.OPEN_REGISTRATION,
                'lastStatusInPhaseHistory.status': TopicStatus.PendingRegistration
            })
            if (results.length === 0) {
                return { answer: 'Không tìm thấy đề tài nào liên quan.', related_topics: [] }
            }
            console.log(results)
            console.log(` Tìm thấy ${results.length} documents liên quan.`)

            // 4. CHUẨN BỊ CONTEXT CHO LLM
            const contextText = results
                .map(([doc, score]) => {
                    return `--- Đề tài (Độ phù hợp: ${score.toFixed(2)}) ---\n${doc.pageContent}`
                })
                .join('\n\n')

            // 5. GỌI GEMINI ĐỂ TRẢ LỜI (GENERATION)
            const model = new ChatGoogleGenerativeAI({
                model: 'gemini-2.5-flash',
                apiKey: this.googleAIConfiguration.apiKey,
                temperature: 0.3
            })

            const promptTemplate = ChatPromptTemplate.fromTemplate(`
            Bạn là chuyên gia tư vấn học vụ. Dựa vào danh sách đề tài tìm được dưới đây, hãy trả lời câu hỏi của sinh viên.
            
            YÊU CẦU:
            1. Trả lời ngắn gọn, đi thẳng vào trọng tâm.
            2. Liệt kê tên các đề tài phù hợp nhất tìm thấy trong Context.
            3. Nếu không có đề tài nào khớp, hãy nói "Hiện chưa có đề tài phù hợp".

            <context>
            {context}
            </context>

            Câu hỏi của sinh viên: {question}
        `)

            // Chain đơn giản: Prompt -> Model -> String Output
            const chain = promptTemplate.pipe(model).pipe(new StringOutputParser())

            const answer = await chain.invoke({
                context: contextText,
                question: cleanQuery
            })

            return {
                answer: answer,
                related_topics: results.map(([doc]) => doc.metadata)
            }
        } catch (error) {
            console.error('❌ Lỗi Critical trong quá trình Search:', error)
            // Log lỗi chi tiết nếu có response từ Google
            if ((error as any).response) {
                console.error('API Error:', JSON.stringify((error as any).response.data))
            }
            throw error // Hoặc return lỗi user friendly
        }
    }

    async recommendTopicsInLibrary(searchTopicsDto: SearchTopicsInLibraryDto) {
        const { description } = searchTopicsDto
        const cleanQuery = description.trim()
        try {
            // 2. TẠO VECTOR CHO CÂU HỎI (MANUAL EMBEDDING)
            const queryVector = await this.queryEmbeddings.embedQuery(cleanQuery)

            // 3. TỰ TÌM KIẾM TRONG MONGODB (VECTOR SEARCH)
            // Tìm 5 kết quả gần nhất
            // similaritySearchVectorWithScore: Trả về [Document, Score]
            const allResults = await this.vectorStoreRead.similaritySearchVectorWithScore(queryVector, 5, {
                'lastStatusInPhaseHistory.phaseName': PeriodPhaseName.COMPLETION,
                'lastStatusInPhaseHistory.status': TopicStatus.Archived
            })
            // 4. LỌC THEO SCORE (chỉ lấy score > 0.5)
            const results = allResults.filter(([doc, score]) => score > 0.7)

            if (results.length === 0) {
                return { answer: 'Không tìm thấy đề tài nào liên quan.', related_topics: [] }
            }
            console.log(` Tìm thấy ${results.length} documents liên quan.`)
            // 4. CHUẨN BỊ CONTEXT CHO LLM
            const contextText = results
                .map(([doc, score]) => {
                    console.log('Related Topic:', score, doc.pageContent)
                    return `--- Đề tài (Độ phù hợp: ${score.toFixed(2)}) ---\n${doc.pageContent}`
                })
                .join('\n\n')

            // 5. GỌI GEMINI ĐỂ TRẢ LỜI (GENERATION)
            const model = new ChatGoogleGenerativeAI({
                model: 'gemini-2.5-flash',
                apiKey: this.googleAIConfiguration.apiKey,
                temperature: 0.6
            })

            const promptTemplate = ChatPromptTemplate.fromTemplate(`
            Bạn là chuyên gia tư vấn học vụ. Dựa vào danh sách đề tài tìm được dưới đây, hãy trả lời câu hỏi của sinh viên.
            
            YÊU CẦU:
            1. Trả lời ngắn gọn, đi thẳng vào trọng tâm.
            2. Liệt kê tên các đề tài phù hợp nhất tìm thấy trong Context.
            3. Nếu không có đề tài nào khớp, hãy nói "Hiện chưa có đề tài phù hợp".

            <context>
            {context}
            </context>

            Câu hỏi của sinh viên: {question}
        `)

            // Chain đơn giản: Prompt -> Model -> String Output
            const chain = promptTemplate.pipe(model).pipe(new StringOutputParser())

            const answer = await chain.invoke({
                context: contextText,
                question: cleanQuery
            })

            return {
                answer: answer,
                related_topics: results.map(([doc]) => doc.metadata)
            }
        } catch (error) {
            console.error('❌ Lỗi Critical trong quá trình Search:', error)
            // Log lỗi chi tiết nếu có response từ Google
            if ((error as any).response) {
                console.error('API Error:', JSON.stringify((error as any).response.data))
            }
            throw error // Hoặc return lỗi user friendly
        }
    }
    async semanticSearchRegisteringTopic(
        periodId: string,
        queries: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<TopicVector>> {
        const currPeriod = await this.periodsService.checkCurrentPeriod(periodId)
        if (!currPeriod) {
            throw new BadGatewayException('Không tìm thấy kì hiện tại cho khoa của bạn.')
        }
        const { query } = queries
        let queryVector: number[] = []
        if (query && query.trim()) {
            queryVector = await this.queryEmbeddings.embedQuery(query.trim())
        }
        return await this.topicVectorRepoInterface.semanticSearchRegisteringTopics(
            queryVector,
            queries,
            periodId
        )
    }

    async semanticSearchLibraryTopic(queries: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<TopicVector>> {
        const { query } = queries
        let queryVector: number[] = []
        if (query && query.trim()) {
            queryVector = await this.queryEmbeddings.embedQuery(query.trim())
        }
        return await this.topicVectorRepoInterface.semanticSearchTopicsInLibrary(
            queryVector,
            queries
        )
    }
    // async searchTopicsInLibrary(query: RequestG etTopicsInLibraryParams): Promise<Paginated<Topic>> {
    //     return await this.getTopicProvider.getTopicsInLibrary(query)
    // }
    
    
}
