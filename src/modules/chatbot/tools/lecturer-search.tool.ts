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
                name: z
                    .string()
                    .optional()
                    .describe('Tên đầy đủ của giảng viên (nếu tìm người cụ thể). VD: "Lê Văn Tuấn", "Nguyễn Minh Huy"'),
                limit: z.number().optional().default(5).describe('Số lượng giảng viên tối đa trả về')
            }) as any,
            func: async ({ query, name, limit }) => {
                try {
                    // Validate and ensure limit is positive
                    const validLimit = Math.max(1, limit || 5)

                    console.log('👨‍🏫 [LECTURER SEARCH] Starting search for:', { query, name, limit: validLimit })

                    // Detect search mode based on name parameter
                    const hasExactName = name && name.trim().length > 0
                    const searchMode = hasExactName ? 'exact_name_first' : 'hybrid'

                    console.log(`🎯 [LECTURER SEARCH] Mode: ${searchMode}`)

                    // Check cache first
                    const cacheKey = hasExactName ? `${query}||${name}` : query
                    const cacheResult = await this.cache.cacheSearchResults(
                        cacheKey,
                        { limit: validLimit },
                        async () => {
                            // Adjust search options based on mode
                            const searchOptions = hasExactName
                                ? {
                                      limit: validLimit * 2,
                                      semanticWeight: 0.3, // Lower semantic weight when name is specified
                                      nameWeight: 0.7, // Higher name weight
                                      scoreThreshold: 0.6,
                                      useDiversityFilter: false // Don't filter when looking for specific person
                                  }
                                : {
                                      limit: validLimit * 3,
                                      semanticWeight: 1,
                                      nameWeight: 0,
                                      scoreThreshold: 0.65,
                                      useDiversityFilter: true
                                  }

                            // Use hybrid search with query parsing
                            const searchResults = await this.hybridSearch.search(query, searchOptions)

                            if (searchResults.length === 0) {
                                return null
                            }

                            console.log(`🔍 [LECTURER SEARCH] Found ${searchResults.length} candidates, reranking...`)

                            // Rerank with LLM
                            const rerankedResults = await this.reranker.rerank(query, searchResults, validLimit)

                            console.log(
                                `✅ [LECTURER SEARCH] Reranking completed, top result: ${rerankedResults[0]?.fullName}`
                            )

                            return rerankedResults
                        },
                        5 * 60 * 1000 // 5 min cache
                    )

                    if (!cacheResult || cacheResult.length === 0) {
                        const message = hasExactName
                            ? `Không tìm thấy giảng viên tên "${name}" phù hợp với yêu cầu. Bạn có thể thử tìm theo lĩnh vực thay vì tên cụ thể không?`
                            : 'Không tìm thấy giảng viên phù hợp với yêu cầu.'
                        return JSON.stringify(
                            {
                                total: 0,
                                message,
                                searchMode: hasExactName ? 'exact_name' : 'hybrid',
                                query,
                                requestedName: name || null,
                                lecturers: []
                            },
                            null,
                            2
                        )
                    }

                    // If exact name search, filter to keep only exact matches in final results
                    let finalResults = cacheResult
                    if (hasExactName && name) {
                        const nameLower = name.toLowerCase().trim()
                        finalResults = cacheResult.filter((lecturer) => {
                            const lecturerNameLower = lecturer.fullName.toLowerCase().trim()
                            // Exact match or very close match
                            return (
                                lecturerNameLower === nameLower ||
                                lecturerNameLower.includes(nameLower) ||
                                nameLower.includes(lecturerNameLower)
                            )
                        })

                        console.log(
                            `🎯 [EXACT NAME FILTER] Filtered from ${cacheResult.length} to ${finalResults.length} exact matches`
                        )

                        if (finalResults.length === 0) {
                            return JSON.stringify(
                                {
                                    total: cacheResult.length,
                                    message: `Không tìm thấy giảng viên tên chính xác "${name}". Có ${cacheResult.length} giảng viên phù hợp với lĩnh vực nhưng tên không khớp.`,
                                    searchMode: 'exact_name',
                                    query,
                                    requestedName: name || null,
                                    lecturers: cacheResult.map((lecturer, idx) => ({
                                        index: idx + 1,
                                        _id: lecturer._id,
                                        fullName: lecturer.fullName,
                                        email: lecturer.email,
                                        bio: lecturer.bio,
                                        title: lecturer.title,
                                        faculty: lecturer.faculty,
                                        areaInterest: lecturer.areaInterest,
                                        researchInterests: lecturer.researchInterests,
                                        publications: lecturer.publications?.slice(0, 3),
                                        similarityScore: lecturer.rerankScore || lecturer.finalScore || 0,
                                        matchReason: lecturer.rerankReason
                                    }))
                                },
                                null,
                                2
                            )
                        }
                    }

                    // Format results with rerank score as similarityScore
                    const formattedLecturers = finalResults.map((lecturer, idx) => ({
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
                            searchMode: hasExactName ? 'exact_name' : 'hybrid',
                            query,
                            requestedName: name || null,
                            lecturers: formattedLecturers
                        },
                        null,
                        2
                    )
                } catch (error) {
                    console.error('❌ [LECTURER SEARCH] Error:', error)
                    return JSON.stringify(
                        {
                            total: 0,
                            error: true,
                            message: `Lỗi khi tìm giảng viên: ${error.message}`,
                            query,
                            lecturers: []
                        },
                        null,
                        2
                    )
                }
            }
        })
    }
}
