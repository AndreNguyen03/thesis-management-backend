import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { Inject, Injectable } from '@nestjs/common'
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
import { Student } from '../../../users/schemas/student.schema'
import groqConfig from '../../../config/groq.config'
import { ChatGroq } from '@langchain/groq'
import { ConfigType } from '@nestjs/config'
import { HybridLecturerSearchProvider } from '../../knowledge-source/application/hybrid-lecturer-search.provider'
import { LecturerRerankerProvider } from '../providers/lecturer-reranker.provider'
import { LecturerSearchCacheProvider } from '../providers/lecturer-search-cache.provider'

@Injectable()
export class ProfileMatchingTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>,
        private readonly hybridSearch: HybridLecturerSearchProvider,
        private readonly reranker: LecturerRerankerProvider,
        private readonly cache: LecturerSearchCacheProvider
    ) {}

    private getLLM() {
        return new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2, // Thấp để reason factual, không hallucinate
            maxTokens: 150 // Giới hạn ngắn cho reason
        })
    }

    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'profile_matching_lecturer_search_tool',
            description: `
Công cụ này tìm giảng viên phù hợp dựa trên profile của sinh viên.

SỬ DỤNG KHI:
- Bạn có thông tin profile sinh viên, muốn gợi ý giảng viên hướng dẫn
- Muốn tìm giảng viên theo chuyên môn phù hợp với sở thích, kỹ năng của sinh viên

QUY TẮC:
- Nếu profile sinh viên chưa có hoặc chưa đầy đủ, chỉ trả về thông báo: 
  "Sinh viên chưa có profile, không thể gợi ý giảng viên."
- Chỉ thực hiện tìm giảng viên khi profile sinh viên đã có thông tin đầy đủ

VÍ DỤ QUERY:
- "Dựa vào profile của tôi hãy gợi ý {n} giảng viên phù hợp để hướng dẫn"
- "Gợi ý giảng viên cho tôi"

OUTPUT: Danh sách giảng viên + thông tin chuyên môn, lĩnh vực nghiên cứu, học hàm, công trình
            `.trim(),
            schema: z.object({
                query: z.string().describe('từ khóa của sinh viên tìm giảng viên bằng profile'),
                limit: z.number().optional().default(5).describe('Số lượng giảng viên tối đa trả về'),
                userId: z.string().optional().describe('ID của sinh viên')
            }) as any,
            func: async ({ query, limit, userId }) => {
                try {
                    console.log('👨‍🏫 [PROFILE MATCHING] Searching lecturers for student:', userId)

                    const student = await this.studentModel.findOne({ userId: new mongoose.Types.ObjectId(userId) })
                    if (!student) {
                        return 'Sinh viên chưa có profile, không thể gợi ý giảng viên.'
                    }

                    const user = await this.userModel.findById(userId).lean()
                    const studentBio = user?.bio?.trim() || ''

                    // Chuẩn hóa các trường
                    const skills = Array.isArray(student.skills) ? student.skills.filter(Boolean) : []
                    const interests = Array.isArray(student.interests) ? student.interests.filter(Boolean) : []

                    // Kiểm tra nếu tất cả đều rỗng
                    const hasProfile = studentBio.length > 0 || skills.length > 0 || interests.length > 0

                    if (!hasProfile) {
                        return 'Sinh viên chưa có profile, không thể gợi ý giảng viên.'
                    }

                    // Tạo cache key dựa trên hash của profile để invalidate khi profile thay đổi
                    const profileData = `${studentBio}|${skills.join(',')}|${interests.join(',')}`
                    const profileHash = Buffer.from(profileData).toString('base64').substring(0, 16)
                    const cacheKey = `profile_match:${userId}:${profileHash}:${limit}`

                    // Check cache với key bao gồm profile hash
                    const cached = this.cache.get(cacheKey)
                    if (cached) {
                        console.log('✅ [PROFILE MATCHING] Cache hit with profile hash')
                        return cached
                    }
                    console.log('🔄 [PROFILE MATCHING] Cache miss, searching with fresh profile...')

                    // Build semantic query from student profile
                    const skillsText = skills.join(', ')
                    const interestsText = interests.length > 0 ? interests.join(', ') : skills.join(', ')
                    const finalQuery = [query, skillsText, interestsText, studentBio].filter(Boolean).join('. ')

                    console.log('📝 [PROFILE MATCHING] Student profile query:', {
                        skills: skills.length,
                        interests: interests.length,
                        hasBio: !!studentBio
                    })

                    // Use hybrid search with profile-based query
                    const searchResults = await this.hybridSearch.search(finalQuery, {
                        limit: limit * 3, // Get more candidates for reranking
                        semanticWeight: 0.5, // Higher semantic weight for profile matching
                        nameWeight: 0.7,
                        useDiversityFilter: true
                    })

                    if (searchResults.length === 0) {
                        return 'Không tìm thấy giảng viên phù hợp với profile của bạn.'
                    }

                    console.log(`🔍 [PROFILE MATCHING] Found ${searchResults.length} candidates, reranking...`)

                    // Rerank with LLM
                    const rerankedResults = await this.reranker.rerank(
                        `Profile matching: ${finalQuery}`,
                        searchResults,
                        limit
                    )

                    console.log(
                        `✅ [PROFILE MATCHING] Reranking completed, top result: ${rerankedResults[0]?.fullName}`
                    )

                    // Tóm tắt profile cho agent (Final Answer)
                    const profileContext = [
                        `Bio: "${studentBio}".`,
                        skills.length > 0 ? `Skills: ${skills.join(', ')}.` : '',
                        interests.length > 0 ? `Interests: ${interests.join(', ')}.` : ''
                    ]
                        .filter(Boolean)
                        .join(' ')

                    const profileSummary = profileContext.substring(0, 150) + (profileContext.length > 150 ? '...' : '')

                    // Format results with rerank scores and reasons
                    const formattedLecturers = rerankedResults.map((lecturer, idx) => ({
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
                        matchType: lecturer.matchType,
                        scores: {
                            name: lecturer.nameMatchScore,
                            semantic: lecturer.semanticScore,
                            combined: lecturer.finalScore,
                            rerank: lecturer.rerankScore
                        },
                        similarityScore: lecturer.rerankScore || lecturer.finalScore, // For UI display
                        matchReason: lecturer.rerankReason // LLM-generated reason
                    }))

                    const result = JSON.stringify(
                        {
                            total: formattedLecturers.length,
                            profileSummary: profileSummary,
                            lecturers: formattedLecturers
                        },
                        null,
                        2
                    )

                    // Cache result for 10 minutes
                    this.cache.set(cacheKey, result, 10 * 60 * 1000)

                    return result
                } catch (error) {
                    console.error('❌ [PROFILE MATCHING] Error:', error)
                    return `Lỗi khi tìm giảng viên: ${error.message}`
                }
            }
        })
    }
}
