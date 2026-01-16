import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ProfileMatchingTool {
    constructor() {}

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
//                 try {
//                     const res = await this.searchProvider.searchSimilarDocuments(queryVector, {
//                         sourceTypes: [SourceType.LECTURER_PROFILE],
//                         limit: limit * 2, // Lấy nhiều chunks để có nhiều lecturer
//                         scoreThreshold: 0.7
//                     })
//                     if (res.length === 0) {
//                         return 'Không tìm thấy giảng viên phù hợp với yêu cầu.'
//                     }

//                     const chunks = plainToInstance(GetKnowledgeChunkDto, res, {
//                         excludeExtraneousValues: true,
//                         enableImplicitConversion: true
//                     })

//                     // B3: Lấy userIds từ chunks qua knowledge source (source_location là userId)
//                     const sourceIds = chunks.map((c) => new mongoose.Types.ObjectId(c.source_id))
//                     const knowledgeSources = await this.knowledgeSourceModel
//                         .find({ _id: { $in: sourceIds } })
//                         .select('_id source_location')
//                     // console.log('knowledgeSources', knowledgeSources)
//                     const userIds = knowledgeSources.map((ks) => new mongoose.Types.ObjectId(ks.source_location))

//                     // B4: Query lecturer bằng userId và populate thông tin user + faculty
//                     let lecturers = await this.lecturerModel.aggregate([
//                         {
//                             $match: {
//                                 userId: { $in: userIds }
//                             }
//                         },
//                         {
//                             $lookup: {
//                                 from: 'users',
//                                 localField: 'userId',
//                                 foreignField: '_id',
//                                 as: 'userInfo'
//                             }
//                         },
//                         {
//                             $unwind: {
//                                 path: '$userInfo',
//                                 preserveNullAndEmptyArrays: true
//                             }
//                         },
//                         {
//                             $lookup: {
//                                 from: 'faculties',
//                                 localField: 'facultyId',
//                                 foreignField: '_id',
//                                 as: 'facultyInfo'
//                             }
//                         },
//                         {
//                             $unwind: {
//                                 path: '$facultyInfo',
//                                 preserveNullAndEmptyArrays: true
//                             }
//                         },
//                         {
//                             $project: {
//                                 _id: '$userInfo._id',
//                                 fullName: '$userInfo.fullName',
//                                 email: '$userInfo.email',
//                                 bio: '$userInfo.bio',
//                                 title: 1,
//                                 faculty: {
//                                     name: '$facultyInfo.name',
//                                     email: '$facultyInfo.email',
//                                     urlDirection: '$facultyInfo.urlDirection'
//                                 },
//                                 areaInterest: 1,
//                                 researchInterests: 1,
//                                 publications: 1
//                             }
//                         }
//                     ])
//                     if (lecturers.length === 0) {
//                         return 'Không tìm thấy thông tin giảng viên.'
//                     }
//                     lecturers = plainToInstance(LecturerKnowledgeDto, lecturers, {
//                         excludeExtraneousValues: true,
//                         enableImplicitConversion: true
//                     })

//                     // B5: Format kết quả cho LLM (PHẦN MỚI: Generate reason bằng LLM)
//                     // Build profile context cho LLM (từ profile user)
//                     const profileContext = [
//                         `Profile sinh viên: Bio "${studentBio}".`,
//                         skills.length > 0 ? `Skills: ${skills.join(', ')}.` : '',
//                         interests.length > 0 ? `Interests: ${interests.join(', ')}.` : ''
//                     ]
//                         .filter(Boolean)
//                         .join(' ')

//                     // Tóm tắt profile ngắn gọn cho agent (Final Answer)
//                     const profileSummary =
//                         profileContext.replace(/Profile sinh viên: /, '').substring(0, 150) +
//                         (profileContext.length > 150 ? '...' : '')

//                     const llm = this.getLLM() // Khởi tạo LLM

//                     // Parallel generate reason cho mỗi lecturer
//                     const formattedLecturers = await Promise.all(
//                         lecturers.slice(0, limit).map(async (lecturer, idx) => {
//                             // Tìm chunk score
//                             const matchingChunk = chunks.find((chunk) => {
//                                 const ks = knowledgeSources.find((ks) => ks._id.toString() === chunk.source_id)
//                                 return ks?.source_location.toString() === (lecturer as any)._id?.toString()
//                             })
//                             const score = matchingChunk?.score || 0

//                             // Build lecturer context
//                             const lecturerContext = [
//                                 `Tên: ${lecturer.fullName} (${lecturer.title}).`,
//                                 `Bio: "${lecturer.bio}".`,
//                                 lecturer.areaInterest?.length > 0
//                                     ? `Lĩnh vực: ${lecturer.areaInterest.join(', ')}.`
//                                     : '',
//                                 lecturer.researchInterests?.length > 0
//                                     ? `Nghiên cứu: ${lecturer.researchInterests.join(', ')}.`
//                                     : ''
//                             ]
//                                 .filter(Boolean)
//                                 .join(' ')

//                             // Mini-prompt cho reason (focused, tiếng Việt)
//                             const reasonPrompt = `Dựa trên profile sinh viên: "${profileContext}"
// Và info giảng viên: "${lecturerContext}"
// Sinh 1-2 câu reason match tự nhiên (tiếng Việt), nhấn mạnh overlap semantic (e.g., kỹ năng chung, lĩnh vực tương đồng từ bio/skills/interests). Giữ ngắn gọn, thân thiện. Score similarity: ${score.toFixed(2)}.`

//                             // Call LLM
//                             let matchReason: string
//                             try {
//                                 const reasonResponse = await llm.invoke(reasonPrompt)
//                                 matchReason = reasonResponse.content.toString().trim()
//                             } catch (llmError) {
//                                 console.error('❌ LLM generate reason error:', llmError)
//                                 // Fallback nếu LLM fail
//                                 matchReason = `Match dựa trên semantic similarity (score ${score.toFixed(2)}), gợi ý thảo luận thêm về lĩnh vực ${lecturer.areaInterest?.[0] || 'chính'} phù hợp với profile bạn.`
//                             }

//                             return {
//                                 index: idx + 1,
//                                 _id: lecturer._id,
//                                 fullName: lecturer.fullName,
//                                 email: lecturer.email,
//                                 bio: lecturer.bio,
//                                 title: lecturer.title,
//                                 faculty: lecturer.faculty,
//                                 areaInterest: lecturer.areaInterest,
//                                 researchInterests: lecturer.researchInterests,
//                                 publications: lecturer.publications,
//                                 similarityScore: score,
//                                 matchReason: matchReason // ← Reason sinh từ LLM
//                             }
//                         })
//                     )

//                     return JSON.stringify(
//                         {
//                             total: formattedLecturers.length,
//                             profileSummary: profileSummary, // ← Tóm tắt profile cho agent
//                             lecturers: formattedLecturers
//                         },
//                         null,
//                         2
//                     )
//                 } catch (error) {
//                     console.error('❌ [LECTURER TOOL] Error:', error)
//                     return `Lỗi khi tìm giảng viên: ${error.message}`
//                 }
                return 'Chức năng đang được phát triển.'
            }
        })
    }
}
