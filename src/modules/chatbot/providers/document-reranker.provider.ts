import { Injectable, Inject } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { ChatGroq } from '@langchain/groq'
import groqConfig from '../../../config/groq.config'

interface DocumentResult {
    text: string
    score?: number
    source_id?: string
}

interface RerankResult {
    index: number
    score: number
    reason: string
}

@Injectable()
export class DocumentRerankerProvider {
    private llm: ChatGroq

    constructor(
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {
        this.llm = new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0
        })
    }

    /**
     * Re-rank documents using LLM to filter out irrelevant results
     * Especially useful for filtering out "biểu mẫu" (forms) when query is about "quy trình" (process)
     */
    async rerankDocuments(query: string, documents: DocumentResult[], topK: number = 3): Promise<DocumentResult[]> {
        if (documents.length === 0) return []
        if (documents.length <= topK) return documents.slice(0, topK)

        // Detect intent - is user asking about process or forms?
        const hasProcessIntent = this.detectProcessIntent(query)

        const prompt = `Bạn là chuyên gia đánh giá độ phù hợp giữa tài liệu và câu hỏi của người dùng.

QUERY CỦA NGƯỜI DÙNG: "${query}"

DANH SÁCH TÀI LIỆU CẦN ĐÁNH GIÁ:
${documents
    .map(
        (doc, idx) => `
[${idx + 1}]
${doc.text.substring(0, 400)}...
`
    )
    .join('\n')}

NHIỆM VỤ:
${
    hasProcessIntent
        ? `
⚠️ QUAN TRỌNG: Người dùng đang hỏi về QUY TRÌNH/HƯỚNG DẪN/THỦ TỤC
- Ưu tiên các tài liệu giải thích "làm thế nào", "các bước thực hiện"
- LOẠI BỎ các tài liệu chỉ liệt kê biểu mẫu, danh sách mẫu đơn
- Tìm tài liệu có nội dung hướng dẫn chi tiết, mô tả quy trình
- Nếu tài liệu chỉ nói "tải biểu mẫu 01, mẫu 02..." mà không giải thích quy trình → điểm thấp
`
        : `
- Đánh giá độ liên quan dựa trên ngữ nghĩa (semantic similarity)
- Ưu tiên tài liệu có nội dung trực tiếp trả lời câu hỏi
`
}

Hãy đánh giá từng tài liệu và chọn TOP ${topK} TÀI LIỆU PHÙ HỢP NHẤT.

Trả về JSON array với định dạng (KHÔNG thêm markdown code block):
[
  {"index": <1-based index>, "score": <0.0-1.0>, "reason": "<lý do ngắn gọn 1 câu>"}
]

Chỉ trả về JSON array, không giải thích thêm.`

        try {
            console.log('🔄 [RERANKER] Starting rerank with LLM...')
            const response = await this.llm.invoke(prompt)
            const content = response.content.toString()

            // Parse JSON from response
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (!jsonMatch) {
                console.error('❌ [RERANKER] Failed to parse JSON from response')
                console.log('Response content:', content)
                return documents.slice(0, topK)
            }

            const rankings: RerankResult[] = JSON.parse(jsonMatch[0])
            console.log(`✅ [RERANKER] LLM ranked ${rankings.length} documents`)

            // Sort by score and return corresponding documents
            const rerankedDocs = rankings
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .map((r) => {
                    const doc = documents[r.index - 1]
                    console.log(`📄 [RERANKER] Doc ${r.index}: score=${r.score}, reason="${r.reason}"`)
                    return doc
                })
                .filter(Boolean)

            return rerankedDocs
        } catch (error) {
            console.error('❌ [RERANKER] Error during reranking:', error)
            return documents.slice(0, topK)
        }
    }

    /**
     * Detect if user is asking about process/procedure vs forms/templates
     */
    private detectProcessIntent(query: string): boolean {
        const processKeywords = [
            'quy trình',
            'hướng dẫn',
            'thủ tục',
            'bước',
            'cách thức',
            'như thế nào',
            'làm sao',
            'thực hiện',
            'tiến hành',
            'các bước'
        ]

        const lowerQuery = query.toLowerCase()
        return processKeywords.some((keyword) => lowerQuery.includes(keyword))
    }

    /**
     * Preprocess query to expand and optimize for search
     * - Remove "biểu mẫu" keywords if asking about process
     * - Expand common abbreviations
     * - Add contextual keywords
     */
    preprocessQuery(query: string): string {
        let processed = query.toLowerCase()

        // Detect process intent
        const hasProcessIntent = this.detectProcessIntent(query)

        // If asking about process, remove form-related keywords
        if (hasProcessIntent) {
            processed = processed.replace(/biểu mẫu|mẫu đơn|form|template|mẫu \d+/gi, '')

            // Add process-related keywords
            if (!processed.includes('hướng dẫn')) {
                processed = `${processed} hướng dẫn chi tiết`
            }
            if (!processed.includes('các bước')) {
                processed = `${processed} các bước thực hiện`
            }
        }

        // Expand common abbreviations
        const expansions: Record<string, string> = {
            'đăng ký': 'đăng ký nộp đề xuất đề tài',
            'đánh giá': 'đánh giá chấm điểm tiêu chí',
            'bảo vệ': 'bảo vệ thuyết trình trình bày',
            'chuyển trường': 'chuyển trường chuyển ngành di chuyển'
        }

        for (const [key, value] of Object.entries(expansions)) {
            if (processed.includes(key) && !processed.includes(value)) {
                processed = processed.replace(key, value)
                break // Only expand once
            }
        }

        return processed.trim()
    }
}
