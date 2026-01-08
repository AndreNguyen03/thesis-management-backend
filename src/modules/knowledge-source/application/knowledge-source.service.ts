import { forwardRef, Injectable } from '@nestjs/common'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model, Document } from 'mongoose'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { RequestKnowledgeSourceDto } from '../dto/request-get-knowledge-source.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { UpdateKnowledgeSourceDto } from '../dto/update-knowledge-source.dto'
import { pipeline } from 'stream'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { TopicStatus } from '../../topics/enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { SourceType } from '../enums/source_type.enum'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { CreateKnowledgeChunksProvider } from './create-knowledge-chunks.provider'
import { buildTopicSummary } from '../../recommend/utils/build-topic-summarize'
import { topicToContentString } from '../../topic_search/utils/get-topic-info-document'
import { RetrievalProvider } from '../../chatbot/providers/retrieval.provider'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'

@Injectable()
export class KnowledgeSourceService {
    constructor(
        private readonly paginationProvider: PaginationProvider,
        @InjectModel(KnowledgeSource.name)
        private readonly knowledgeSourceModel: Model<KnowledgeSource & Document>,
        private readonly getTopicProvider: GetTopicProvider,
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider,
        private readonly retrievalProvider: RetrievalProvider
    ) {}
    async findAll(query: RequestKnowledgeSourceDto): Promise<Paginated<KnowledgeSource & Document>> {
        // pipeline getting Owner information
        let pipelineSub: any[] = []
        pipelineSub.push({
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner_info'
            }
        })
        pipelineSub.push({
            $addFields: {
                owner_info: { $arrayElemAt: ['$owner_info', 0] }
            }
        })
        // pipelineSub.push({ $unwind: { path: '$owner_info', preserveNullAndEmptyArrays: true } })

        // Implementation for fetching knowledge sources based on the query
        return await this.paginationProvider.paginateQuery(
            {
                limit: query.limit,
                page: query.page
            },
            this.knowledgeSourceModel,
            pipelineSub
        )
    }
    async updateKnowledgeSources(klid: string, query: UpdateKnowledgeSourceDto): Promise<KnowledgeSource | null> {
        const updatedKnowledgeSource = await this.knowledgeSourceModel
            .findByIdAndUpdate(klid, query, { new: true })
            .exec()
        return updatedKnowledgeSource ? updatedKnowledgeSource.toObject() : null
    }
    async syncTopicsDataToKnowledgeSource(periodId: string, userId: string): Promise<{ message: string }> {
        //lấy cái đề tài đang mở đăng ký trong kỳ hiện tại
        const registeringTopics = await this.getTopicProvider.getTopicsInPhase(periodId, {
            page: 1,
            limit: 0,
            phase: PeriodPhaseName.OPEN_REGISTRATION
        })
        //lấy tất cả các đề tài trong thư viện
        const topicsInLibrary = await this.getTopicProvider.getTopicsInLibrary({
            page: 1,
            limit: 0,
            status: TopicStatus.Archived
        })
        //xử lý đồng bộ dữ liệu đề tài vào knowledge source
        //...
        // Sử dụng updateOne với upsert để tạo mới hoặc cập nhật
        for (const topic of registeringTopics.data) {
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
                console.log('sourceDoc', topic)
                const text = topicToContentString(topic)
                console.log('text', text)
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
        for (const topic of topicsInLibrary.data) {
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

        return {
            message: `Đã đồng bộ ${topicsInLibrary.data.length + registeringTopics.data.length} đề tài vào nguồn tri thức`
        }
    }
    async semanticSearchKnowledgeSources(query: string): Promise<KnowledgeChunk[]> {
        const embedding = await this.getEmbeddingProvider.getEmbedding(query)
        return await this.retrievalProvider.searchSimilarDocuments(embedding, {
            limit: 20,
            sourceTypes: [SourceType.TOPIC_LIBRARY, SourceType.TOPIC_REGISTERING]
        })
    }
}
