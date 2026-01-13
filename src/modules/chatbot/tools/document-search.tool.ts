import { DynamicStructuredTool } from '@langchain/core/tools'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider'
import { GetEmbeddingProvider } from '../providers/get-embedding.provider'
import { z } from 'zod'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeChunkDto } from '../../knowledge-source/dto/get-knowledge-chunk.dto'
import { Injectable } from '@nestjs/common'
@Injectable()
export class DocumentSearchTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider
    ) {}

    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_documents',
            description: `
Công cụ tìm kiếm TÀI LIỆU, HƯỚNG DẪN, QUY TRÌNH về khóa luận.

SỬ DỤNG KHI:
- Người dùng hỏi về quy trình, quy định đăng ký, thực hiện khóa luận, nghiên cứu khoa học
- Muốn tìm tài liệu tham khảo
- Hỏi "cách đăng ký đề tài như thế nào?"
- Hỏi "quy trình bảo vệ khóa luận?"

VÍ DỤ QUERY:
- "Quy trình đăng ký đề tài"
- "Tiêu chí đánh giá khóa luận"
- "Hướng dẫn viết báo cáo"

OUTPUT: Đoạn text trích dẫn từ tài liệu + link nguồn
            `.trim(),
            schema: z.object({
                query: z.string().describe('Câu hỏi về tài liệu/quy trình'),
                limit: z.number().optional().default(20).describe('Số lượng tài liệu trả về tối đa')
            }) as any,
            func: async ({ query, limit }) => {
                try {
                    console.log('📄 [DOCUMENT TOOL] Searching documents:', query)

                    // Query expansion: tự động mở rộng nếu query quá ngắn
                    let expandedQuery = query
                    const wordCount = query.trim().split(/\s+/).length
                    if (wordCount < 5) {
                        expandedQuery = `${query} quy trình hướng dẫn thực hiện khóa luận tốt nghiệp nghiên cứu khoa học yêu cầu đăng ký bảo vệ báo cáo`
                        console.log('📄 [DOCUMENT TOOL] Query expanded:', expandedQuery)
                    }
                    const queryVector = await this.embeddingProvider.getEmbedding(expandedQuery)

                    const results = await this.searchProvider.searchSimilarDocuments(queryVector, {
                        sourceTypes: [SourceType.URL, SourceType.FILE],
                        limit,
                        scoreThreshold: 0.8 // Giữ threshold thấp như bạn đã chỉnh
                    })
                    if (results.length === 0) {
                        console.log('📄 [DOCUMENT TOOL] No documents found for query:', expandedQuery)
                        return 'Không tìm thấy tài liệu phù hợp.'
                    }
                    const chunks = plainToInstance(GetKnowledgeChunkDto, results, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })
                    // Format: text + source link
                    const formattedDocs = chunks.map((chunk, idx) => ({
                        index: idx + 1,
                        text: chunk.text,
                        score: chunk.score.toFixed(3),
                        sourceId: chunk.source_id
                    }))

                    return JSON.stringify(
                        {
                            total: formattedDocs.length,
                            documents: formattedDocs
                        },
                        null,
                        2
                    )
                } catch (error) {
                    console.error('❌ [DOCUMENT TOOL] Error:', error)
                    return `Lỗi khi tìm tài liệu: ${error.message}`
                }
            }
        })
    }
}
