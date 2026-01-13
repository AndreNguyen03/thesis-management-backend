import { Process, Processor } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { GetGeneralTopics } from '../../topics/dtos'
import { InjectModel } from '@nestjs/mongoose'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { Model } from 'mongoose'
import { SourceType } from '../enums/source_type.enum'
import { topicToContentString } from '../../topic_search/utils/get-topic-info-document'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { CreateKnowledgeChunksProvider } from '../application/create-knowledge-chunks.provider'
import { Job } from 'bull'

@Injectable()
@Processor('knowledge-sync-queue')
export class KnowledgeSyncProvider {
    constructor(
        @InjectModel(KnowledgeSource.name)
        private readonly knowledgeSourceModel: Model<KnowledgeSource & Document>,
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider
    ) {}
    @Process('sync-registering-topic-knowledge-source')
    async syncRegisteringTopicsDataToKnowledgeSource(
        job: Job<{ registeringTopics: GetGeneralTopics[]; userId: string }>
    ): Promise<{ message: string; total: number }> {
        const { registeringTopics, userId } = job.data
        console.log('registeringTopics', registeringTopics)
        //xử lý đồng bộ dữ liệu đề tài vào knowledge source
        //...
        // Sử dụng updateOne với upsert để tạo mới hoặc cập nhật
        for (const topic of registeringTopics) {
            await this.knowledgeSourceModel.updateOne(
                {
                    source_type: SourceType.TOPIC_REGISTERING,
                    source_location: topic._id
                },
                {
                    $set: {
                        source_type: SourceType.TOPIC_REGISTERING,
                        source_location: topic._id,
                        title: topic.titleVN,
                        description: 'Đề tài trong đợt đăng ký',
                        owner: userId,
                        status: 'ENABLED'
                    }
                },
                { upsert: true }
            )
            const sourceDoc = await this.knowledgeSourceModel.findOne({
                source_type: SourceType.TOPIC_REGISTERING,
                source_location: topic._id.toString()
            })

            if (sourceDoc) {
                const text = topicToContentString(topic)
                const embedding = await this.getEmbeddingProvider.getEmbedding(text)
                await this.knowledgeChunksProvider.createKnowledgeChunks([
                    {
                        source_id: sourceDoc._id.toString(),
                        text: text, // Make sure chunk is defined
                        plot_embedding_gemini_large: embedding // Make sure vector is defined
                    }
                ])
            }
        }
        console.log(`✅ Đã đồng bộ xong ${registeringTopics.length} đề tài đăng ký lên nguồn tri thức`)
        return {
            message: `Đã đồng bộ ${registeringTopics.length} đề tài vào nguồn tri thức`,
            total: registeringTopics.length
        }
    }

    @Process('sync-topics-in-library-knowledge-source')
    async syncTopicsInLibraryDataToKnowledgeSource(
        job: Job<{ topicsInLibrary: GetGeneralTopics[]; userId: string }>
    ): Promise<{ message: string; total: number }> {
        const { topicsInLibrary, userId } = job.data
        //xử lý đồng bộ dữ liệu đề tài vào knowledge source
        //...
        console.log('topicsInLibrary', topicsInLibrary)
        for (const topic of topicsInLibrary) {
            await this.knowledgeSourceModel.updateOne(
                {
                    source_type: SourceType.TOPIC_LIBRARY,
                    source_location: topic._id
                },
                {
                    $set: {
                        source_type: SourceType.TOPIC_LIBRARY,
                        source_location: topic._id,
                        title: topic.titleVN,
                        description: 'Đề tài trong thư viện đề tài',
                        owner: userId,
                        status: 'ENABLED'
                    }
                },
                { upsert: true }
            )
            const sourceDoc = await this.knowledgeSourceModel.findOne({
                source_type: SourceType.TOPIC_LIBRARY,
                source_location: topic._id.toString()
            })

            if (sourceDoc) {
                const text = topicToContentString(topic)
                const embedding = await this.getEmbeddingProvider.getEmbedding(text)
                await this.knowledgeChunksProvider.createKnowledgeChunks([
                    {
                        source_id: sourceDoc._id.toString(),
                        text: text, // Make sure chunk is defined
                        plot_embedding_gemini_large: embedding // Make sure vector is defined
                    }
                ])
            }
        }
        console.log(`✅ Đã đồng bộ xong ${topicsInLibrary.length} đề tài trong thư viện lên nguồn tri thức`)
        return {
            message: `Đã đồng bộ ${topicsInLibrary.length} đề tài vào nguồn tri thức`,
            total: topicsInLibrary.length
        }
    }
}
