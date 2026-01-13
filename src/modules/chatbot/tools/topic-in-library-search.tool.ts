import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider'
import { GetEmbeddingProvider } from '../providers/get-embedding.provider'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeChunkDto } from '../../knowledge-source/dto/get-knowledge-chunk.dto'
import { Injectable } from '@nestjs/common'
@Injectable()
export class TopicInLibrarySearchTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        private readonly getTopicProvider: GetTopicProvider
    ) {}

    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_in_library_topics',
            description: `
Công cụ tìm kiếm ĐỀ TÀI KHÓA LUẬN/ĐỒ ÁN tốt nghiệp.

SỬ DỤNG KHI:
- Người dùng hỏi về đề tài khóa luận, đồ án
- Muốn tìm đề tài theo chủ đề, lĩnh vực, công nghệ
- Hỏi "đề tài nào phù hợp với em?"
- Hỏi "có đề tài về AI/blockchain/web không?"

VÍ DỤ QUERY:
- "Tìm đề tài về trí tuệ nhân tạo"
- "Đề tài sử dụng React Native"
- "Đề tài liên quan đến blockchain"

OUTPUT: Danh sách đề tài kèm thông tin chi tiết (tên, mô tả, yêu cầu, giảng viên)
            `.trim(),
            schema: z.object({
                query: z.string().describe('Câu hỏi hoặc từ khóa tìm kiếm đề tài'),
                limit: z.number().optional().default(5).describe('Số lượng đề tài tối đa trả về')
            }) as any,
            func: async ({ query, limit }) => {
                try {
                    console.log('🔍 [TOPIC TOOL] Searching topics:', query)

                    // B1: Tạo embedding cho query
                    const queryVector = await this.embeddingProvider.getEmbedding(query)

                    // B2: Vector search với filter TOPIC
                    const res = await this.searchProvider.searchSimilarDocuments(queryVector, {
                        sourceTypes: [SourceType.TOPIC_LIBRARY],
                        limit: limit * 3, // Lấy nhiều chunks
                        scoreThreshold: 0.7
                    })
                    if (res.length === 0) {
                        return 'Không tìm thấy đề tài phù hợp với yêu cầu.'
                    }
                    const chunks = plainToInstance(GetKnowledgeChunkDto, res, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })
                    // B3: Lấy topicIds từ chunks qua knowledge source
                    const sourceIds = chunks.map((c) => new mongoose.Types.ObjectId(c.source_id))
                    const knowledgeSources = await this.knowledgeSourceModel
                        .find({ _id: { $in: sourceIds } })
                        .select('_id source_location')
                    const topicIds = knowledgeSources.map((ks) => ks.source_location.toString())

                    // B4: Populate topic tiêu chuẩn từ DB
                    const topics = await this.getTopicProvider.getStandarStructureTopicsByTopicIds(topicIds, limit)

                    // B5: Format kết quả cho LLM
                    const formattedTopics = topics.map((topic, idx) => {
                        // Tìm chunk tương ứng để lấy score
                        const matchingChunk = chunks.find((chunk) => {
                            const ks = knowledgeSources.find((ks) => ks._id.toString() === chunk.source_id)
                            return ks?.source_location.toString() === topic._id.toString()
                        })

                        return {
                            index: idx + 1,
                            _id: topic._id,
                            titleVN: topic.titleVN,
                            titleEng: topic.titleEng || 'N/A',
                            description: topic.description?.substring(0, 300) + '...',
                            fields: topic.fields?.map((f) => f.name).join(', ') || 'N/A',
                            requirements: topic.requirements?.map((r) => r.name).join(', ') || 'N/A',
                            major: topic.major?.name || 'N/A',
                            lecturers: topic.lecturers?.map((l) => `${l.fullName} (${l.email})`).join(', ') || 'N/A',
                            maxStudents: topic.maxStudents || 1,
                            type: topic.type || 'N/A',
                            similarityScore: matchingChunk?.score || 0
                        }
                    })

                    return JSON.stringify(
                        {
                            total: formattedTopics.length,
                            topics: formattedTopics
                        },
                        null,
                        2
                    )
                } catch (error) {
                    console.error('❌ [TOPIC TOOL] Error:', error)
                    return `Lỗi khi tìm đề tài: ${error.message}`
                }
            }
        })
    }
}
