import { Injectable, OnModuleInit, Inject } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ConfigType } from '@nestjs/config'
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import { googleAIConfig } from '../../config/googleai.config'
import { TopicVector } from './schemas/topic_vectore.schemas'
import { Topic } from '../topics/schemas/topic.schemas'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { createRetrievalChain } from 'langchain/chains/retrieval'
@Injectable()
export class SearchService implements OnModuleInit {
    // 1. Khai báo property vectorStore để dùng được ở các hàm khác trong class
    private vectorStore: MongoDBAtlasVectorSearch

    constructor(
        @InjectModel(TopicVector.name)
        private readonly topicVectorModel: Model<TopicVector>,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>,
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfiguration: ConfigType<typeof googleAIConfig>
    ) {}

    async onModuleInit() {
        try {
            const embeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'text-embedding-003',
                apiKey: this.googleAIConfiguration.apiKey
            })

            this.vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
                collection: this.topicVectorModel.collection as any,
                indexName: 'search_topic_vector_index',
                textKey: 'text_content',
                embeddingKey: 'embedding'
            })

            console.log('🤖 Chatbot Service đã khởi tạo Vector Store thành công!')
        } catch (error) {
            console.error('❌ Lỗi khởi tạo Chatbot Service:', error)
        }
    }

    async syncData() {
        const rawTopics = await this.topicModel.find({ deleted_at: null }).exec()
        if (rawTopics.length === 0) {
            console.log('Không có đề tài nào')
            return
        }

        // ... (Code map docs giữ nguyên) ...
        // const docs = rawTopics.map(
        //     (topic) =>
        //         new Document({
        //             pageContent: `Tên đề tài bằng tiếng Anh: ${topic.titleEng}. Tên đề tài bằng tiếng Việt: ${topic.titleVN}
        //             . Mô tả: ${topic.description}. GVHD: ${topic.lecturer}`,
        //             metadata: { original_id: topic._id, status: topic.status }
        //         })
        // )

        // // QUAN TRỌNG: Phải xóa dữ liệu vector CŨ (của OpenAI) đi vì nó không tương thích với Google
        // //  await db.collection(this.VECTOR_COLLECTION_NAME).deleteMany({})

        // await this.vectorStore.addDocuments(docs)
        // console.log(`✅ Đã đồng bộ xong ${docs.length} đề tài bằng Gemini Embeddings!`)
    }

    async searchWithDescription(description: string) {
        // 3. CẤU HÌNH CHAT MODEL GOOGLE (LLM)
        const model = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-flash',
            apiKey: this.googleAIConfiguration.apiKey,
            temperature: 0.7,
            maxOutputTokens: 1000
        })

        const prompt = ChatPromptTemplate.fromTemplate(`
      Bạn là Trợ lý học vụ. Trả lời dựa trên context sau:
      <context>
      {context}
      </context>
      Câu hỏi: {input}
    `)

        const chain = await createRetrievalChain({
            retriever: this.vectorStore.asRetriever({ k: 3 }),
            combineDocsChain: await createStuffDocumentsChain({ llm: model, prompt })
        })

        const response = await chain.invoke({ input: description })

        return {
            answer: response.answer,
            related_topics: response.context.map((doc) => doc.metadata)
        }
    }
}
