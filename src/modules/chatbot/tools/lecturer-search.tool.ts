import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider'
import { GetEmbeddingProvider } from '../providers/get-embedding.provider'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeChunkDto } from '../../knowledge-source/dto/get-knowledge-chunk.dto'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import mongoose from 'mongoose'
import { LecturerKnowledgeDto } from '../dtos/get-enough-knowledge-result.dto'
import { HybridLecturerSearchProvider } from '../../knowledge-source/application/hybrid-lecturer-search.provider'
import { LecturerRerankerProvider } from '../providers/lecturer-reranker.provider'
import { LecturerSearchCacheProvider } from '../providers/lecturer-search-cache.provider'

@Injectable()
export class LecturerSearchTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly hybridSearch: HybridLecturerSearchProvider,
        private readonly reranker: LecturerRerankerProvider,
        private readonly cache: LecturerSearchCacheProvider
    ) {}

    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_lecturers',
            description: `
Công cụ tìm kiếm GIẢNG VIÊN hướng dẫn khóa luận hoặc nghiên cứu đề tài.

SỬ DỤNG KHI:
- Người dùng hỏi về giảng viên theo chuyên môn, lĩnh vực nghiên cứu
- Muốn tìm giảng viên phù hợp với đề tài
- Hỏi "giảng viên nào chuyên về AI/blockchain/mobile?"
- Hỏi "thầy/cô nào hướng dẫn về machine learning?"

VÍ DỤ QUERY:
- "Giảng viên chuyên về trí tuệ nhân tạo"
- "Thầy/cô hướng dẫn blockchain"
- "Giảng viên nghiên cứu mobile development"
- "Ai có kinh nghiệm về deep learning?"

OUTPUT: Danh sách giảng viên + thông tin chuyên môn, lĩnh vực nghiên cứu, học hàm, công trình
            `.trim(),
            schema: z.object({
                query: z.string().describe('Câu hỏi hoặc từ khóa về chuyên môn/lĩnh vực giảng viên'),
                limit: z.number().optional().default(5).describe('Số lượng giảng viên tối đa trả về')
            }) as any,
            func: async ({ query, limit }) => {
                try {
                    console.log('👨‍🏫 [LECTURER SEARCH] Starting search for:', query)

                    // Check cache first
                    const cacheResult = await this.cache.cacheSearchResults(
                        query,
                        { limit },
                        async () => {
                            // Use hybrid search with query parsing
                            const searchResults = await this.hybridSearch.search(query, {
                                limit: limit * 3, // Get more candidates for reranking
                                semanticWeight: 0.6,
                                nameWeight: 0.4,
                                useDiversityFilter: true
                            })

                            if (searchResults.length === 0) {
                                return null
                            }

                            console.log(`🔍 [LECTURER SEARCH] Found ${searchResults.length} candidates, reranking...`)

                            // Rerank with LLM
                            const rerankedResults = await this.reranker.rerank(query, searchResults, limit)

                            console.log(
                                `✅ [LECTURER SEARCH] Reranking completed, top result: ${rerankedResults[0]?.fullName}`
                            )

                            return rerankedResults
                        },
                        5 * 60 * 1000 // 5 min cache
                    )

                    if (!cacheResult || cacheResult.length === 0) {
                        return 'Không tìm thấy giảng viên phù hợp với yêu cầu.'
                    }

                    // Format results with rerank score as similarityScore
                    const formattedLecturers = cacheResult.map((lecturer, idx) => ({
                        index: idx + 1,
                        _id: lecturer._id,
                        fullName: lecturer.fullName,
                        email: lecturer.email,
                        bio: lecturer.bio,
                        title: lecturer.title,
                        faculty: lecturer.faculty,
                        areaInterest: lecturer.areaInterest,
                        researchInterests: lecturer.researchInterests,
                        publications: lecturer.publications?.slice(0, 3), // Top 3 publications
                        similarityScore: lecturer.rerankScore || lecturer.finalScore || 0, // Use rerank score as main score
                        matchReason: lecturer.rerankReason // LLM-generated reason
                    }))

                    return JSON.stringify(
                        {
                            total: formattedLecturers.length,
                            lecturers: formattedLecturers
                        },
                        null,
                        2
                    )
                } catch (error) {
                    console.error('❌ [LECTURER SEARCH] Error:', error)
                    return `Lỗi khi tìm giảng viên: ${error.message}`
                }
            }
        })
    }
}
