import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider copy'
import { GetEmbeddingProvider } from '../providers/get-embedding.provider'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeChunkDto } from '../../knowledge-source/dto/get-knowledge-chunk.dto'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import mongoose from 'mongoose'

@Injectable()
export class LecturerSearchTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>
    ) {}

    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_lecturers',
            description: `
Công cụ tìm kiếm GIẢNG VIÊN hướng dẫn khóa luận.

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
                    console.log('👨‍🏫 [LECTURER TOOL] Searching lecturers:', query)

                    // B1: Tạo embedding cho query
                    const queryVector = await this.embeddingProvider.getEmbedding(query)

                    // B2: Vector search với filter LECTURER
                    const res = await this.searchProvider.searchSimilarDocuments(queryVector, {
                        sourceTypes: [SourceType.LECTURER_PROFILE],
                        limit: limit * 2, // Lấy nhiều chunks để có nhiều lecturer
                        scoreThreshold: 0.7
                    })

                    if (res.length === 0) {
                        return 'Không tìm thấy giảng viên phù hợp với yêu cầu.'
                    }

                    const chunks = plainToInstance(GetKnowledgeChunkDto, res, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })

                    // B3: Lấy userIds từ chunks qua knowledge source (source_location là userId)
                    const sourceIds = chunks.map((c) => new mongoose.Types.ObjectId(c.source_id))
                    const knowledgeSources = await this.knowledgeSourceModel
                        .find({ _id: { $in: sourceIds } })
                        .select('_id source_location')
                   /// console.log('knowledgeSources', knowledgeSources)
                    const userIds = knowledgeSources.map((ks) => new mongoose.Types.ObjectId(ks.source_location))

                    // B4: Query lecturer bằng userId và populate thông tin user + faculty
                    const lecturers = await this.lecturerModel
                        .find({ userId: { $in: userIds } })
                        .populate('userId', 'fullName email bio avatarUrl')
                        .populate('facultyId', 'name')
                        .limit(limit)
                        .lean()

                    if (lecturers.length === 0) {
                        return 'Không tìm thấy thông tin giảng viên.'
                    }
                    // B5: Format kết quả cho LLM
                    const formattedLecturers = lecturers.map((lecturer, idx) => {
                        const user = lecturer.userId as any
                        const faculty = lecturer.facultyId as any

                        // Tìm chunk tương ứng để lấy score
                        const matchingChunk = chunks.find((chunk) => {
                            const ks = knowledgeSources.find((ks) => ks._id.toString() === chunk.source_id)
                            return ks?.source_location.toString() === (lecturer.userId as any)?._id?.toString()
                        })

                        return {
                            index: idx + 1,
                            _id: lecturer._id,
                            fullName: user?.fullName || 'N/A',
                            email: user?.email || 'N/A',
                            title: lecturer.title || 'N/A', // Học hàm (Master, PhD, Professor)
                            faculty: faculty?.name || 'N/A',
                            bio: user?.bio || 'Chưa cập nhật',
                            researchInterests: lecturer.researchInterests?.join(', ') || 'Chưa cập nhật',
                            areaInterest: lecturer.areaInterest?.join(', ') || 'Chưa cập nhật',
                            publications: lecturer.publications?.length || 0,
                            topPublications:
                                lecturer.publications
                                    ?.slice(0, 3)
                                    .map((p) => `${p.title} (${p.year})`)
                                    .join(' | ') || 'Chưa có',
                            similarityScore: matchingChunk?.score || 0
                        }
                    })

                    return JSON.stringify(
                        {
                            total: formattedLecturers.length,
                            lecturers: formattedLecturers
                        },
                        null,
                        2
                    )
                } catch (error) {
                    console.error('❌ [LECTURER TOOL] Error:', error)
                    return `Lỗi khi tìm giảng viên: ${error.message}`
                }
            }
        })
    }
}
