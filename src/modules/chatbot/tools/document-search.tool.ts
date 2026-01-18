import { DynamicStructuredTool } from '@langchain/core/tools'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider'
import { GetEmbeddingProvider } from '../providers/get-embedding.provider'
import { z } from 'zod'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeChunkDto } from '../../knowledge-source/dto/get-knowledge-chunk.dto'
import { Injectable } from '@nestjs/common'
import { DocumentRerankerProvider } from '../providers/document-reranker.provider'

@Injectable()
export class DocumentSearchTool {
    constructor(
        private readonly searchProvider: SearchSimilarDocumentsProvider,
        private readonly embeddingProvider: GetEmbeddingProvider,
        private readonly rerankerProvider: DocumentRerankerProvider
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
                    console.log('📄 [DOCUMENT TOOL] Original query:', query)

                    // Step 1: Preprocess query to optimize search
                    const processedQuery = this.rerankerProvider.preprocessQuery(query)
                    console.log('📄 [DOCUMENT TOOL] Processed query:', processedQuery)

                    // Step 2: Detect if asking about process vs forms
                    const hasProcessIntent = ['quy trình', 'hướng dẫn', 'thủ tục', 'như thế nào'].some((keyword) =>
                        query.toLowerCase().includes(keyword)
                    )

                    // Step 3: Create embedding with processed query
                    const queryVector = await this.embeddingProvider.getEmbedding(processedQuery)

                    // Step 4: Search with higher threshold for better quality
                    const searchLimit = Math.min(limit * 2, 20) // Giảm từ 30 xuống 20 để nhanh hơn
                    const results = await this.searchProvider.searchSimilarDocuments(queryVector, {
                        sourceTypes: hasProcessIntent ? [SourceType.URL] : [SourceType.URL, SourceType.FILE],
                        limit: searchLimit,
                        scoreThreshold: 0.2
                    })

                    if (results.length === 0) {
                        console.log('📄 [DOCUMENT TOOL] No documents found')
                        return 'Không tìm thấy tài liệu phù hợp.'
                    }

                    console.log(`📄 [DOCUMENT TOOL] Found ${results.length} initial results`)

                    // Step 5: Post-filter to remove form-heavy documents if asking about process
                    let filteredResults = results
                    if (hasProcessIntent) {
                        filteredResults = results.filter((doc) => {
                            const text = doc.text.toLowerCase()
                            // Count form-related keywords
                            const formKeywords = (text.match(/biểu mẫu|mẫu \d+|form template|tải mẫu/g) || []).length
                            // Reject if more than 3 mentions of forms
                            return formKeywords < 3
                        })
                        console.log(
                            `📄 [DOCUMENT TOOL] After form filter: ${filteredResults.length}/${results.length} docs`
                        )
                    }

                    if (filteredResults.length === 0) {
                        return 'Không tìm thấy tài liệu về quy trình phù hợp (chỉ có biểu mẫu).'
                    }

                    // Step 6: LLM Reranking - skip nếu ít kết quả để giảm latency
                    let finalResults :any[] = filteredResults
                    if (filteredResults.length > 5) {
                        // Chỉ rerank nếu có > 5 docs, nếu ít thì skip để nhanh hơn
                        console.log('📄 [DOCUMENT TOOL] Reranking with LLM...')
                        const rerankedResults = await this.rerankerProvider.rerankDocuments(
                            query,
                            filteredResults.map((r) => ({ text: r.text, source_id: r.source_id })),
                            Math.min(limit, 8) // Giảm từ 10 xuống 8
                        )
                        finalResults = rerankedResults
                    } else {
                        console.log('📄 [DOCUMENT TOOL] Skip reranking (too few results)')
                        // Chỉ lấy top results theo score
                    }

                    console.log(`📄 [DOCUMENT TOOL] Final results: ${finalResults.length} docs`)

                    // Step 7: Format output
                    const chunks = plainToInstance(
                        GetKnowledgeChunkDto,
                        finalResults.map((r, idx) => ({
                            ...r,
                            score: r.score || 0.8 // Default score if missing
                        })),
                        {
                            excludeExtraneousValues: true,
                            enableImplicitConversion: true
                        }
                    )

                    const formattedDocs = chunks.map((chunk, idx) => ({
                        index: idx + 1,
                        text: chunk.text,
                        score: chunk.score?.toFixed(3) || 'N/A',
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
