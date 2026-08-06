import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { GetGeneralTopics } from '../../topics/dtos'
import { Document } from '@langchain/core/documents'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { googleAIConfig } from '../../../config/googleai.config'
import { ConfigType } from '@nestjs/config'
import { CreateSearchIndexProvider } from './create-search-index.provider'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import { TopicVector } from '../schemas/topic-vector.schemas'
import { topicToDocument } from '../utils/get-topic-info-document'
import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bullmq'

@Injectable()
@Processor('vector-sync-queue')
export class VectorSyncProcessor implements OnModuleInit {
    private vectorStore: MongoDBAtlasVectorSearch
    private embeddings: GoogleGenerativeAIEmbeddings
    constructor(
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfiguration: ConfigType<typeof googleAIConfig>,
        @InjectModel(TopicVector.name)
        private readonly topicVectorModel: Model<TopicVector>,
        private readonly createSearchIndexProvider: CreateSearchIndexProvider
    ) {}
    async onModuleInit() {
        try {
            this.embeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'gemini-embedding-001',
                apiKey: this.googleAIConfiguration.apiKey
            })
            //tạo vector_index nếu có
            await this.createSearchIndexProvider.createTopicVectorIndexer('search_topic_vector_index', 'embedding')
            await this.createSearchIndexProvider.createKnowledgeChunkIndexer(
                'search_knowledge_chunk',
                'plot_embedding_gemini_large'
            )

            const collectionName = this.topicVectorModel.collection.name
            const collection = this.topicVectorModel.db.db?.collection(collectionName)
            this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
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
    //Đồng bộ dữ liệu các đề tài trong kỳ và pha cụ thể lên vector store
    @Process('sync-registering-topics-in-period')
    async syncDataInPeriodOnPhase(job: Job<{ topics: GetGeneralTopics[] }>) {
        const { topics } = job.data
        if (topics.length === 0) {
            return
        }

        const docs = topics.map((topic) => {
            return topicToDocument(topic)
        })

        //  await db.collection(this.VECTOR_COLLECTION_NAME).deleteMany({})
        try {
            const original_ids = docs.map((doc) => doc.metadata.original_id) // hoặc doc.id nếu có
            await this.topicVectorModel.deleteMany({ original_id: { $in: original_ids } }) // xóa trùng
            await this.vectorStore.addDocuments(docs)
            console.log(`✅ Đã đồng bộ xong ${docs.length} đề tài bằng Gemini Embeddings!`)
        } catch (error) {
            console.error('❌ Lỗi khi thêm documents vào vector store:', error)
            throw error
        }
    }

    // //Đồng bộ dữ liệu các đề tài trong kỳ và pha cụ thể lên vector store
    @Process('sync-registering-topics-in-period-by-chunks')
    async syncDataInPeriodOnPhaseByChunk(job: Job<{ topics: GetGeneralTopics[] }>) {
        const { topics } = job.data
        if (topics.length === 0) {
            return
        }
        const docs: Document[] = []
        docs.push(
            ...topics.map((topic) => {
                return topicToDocument(topic)
            })
        )

        //  await db.collection(this.VECTOR_COLLECTION_NAME).deleteMany({})
        try {
            await this.vectorStore.addDocuments(docs)
            console.log(`✅ Đã đồng bộ xong ${docs.length} đề tài bằng Gemini Embeddings!`)
        } catch (error) {
            console.error('❌ Lỗi khi thêm documents vào vector store:', error)
            throw error
        }
    }
}
