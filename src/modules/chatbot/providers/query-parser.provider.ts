import { Injectable, Inject } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { ChatGroq } from '@langchain/groq'
import groqConfig from '../../../config/groq.config'

export interface ParsedQuery {
    personNames: string[] // Tên người được detect
    concepts: string[] // Các khái niệm/keywords
    rawQuery: string // Query gốc
    hasNameEntity: boolean // Flag để xác định có name entity không
}

@Injectable()
export class QueryParserProvider {
    // Vietnamese name patterns
    private readonly vietnameseNamePatterns = [
        // Full name patterns (Họ + Tên đệm + Tên)
        /(?:^|\s)([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})(?:\s|$)/g,
        // Abbreviated name (e.g., "TS. Nguyễn Văn A", "PGS. Lê Thị B")
        /(?:TS|PGS|GS|ThS|CN|KS)\.?\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})/gi
    ]

    // Common Vietnamese surnames for validation
    private readonly commonSurnames = new Set([
        'nguyễn',
        'trần',
        'lê',
        'phạm',
        'hoàng',
        'huỳnh',
        'phan',
        'vũ',
        'võ',
        'đặng',
        'bùi',
        'đỗ',
        'hồ',
        'ngô',
        'dương',
        'lý'
    ])

    // Technical abbreviations and keywords
    private readonly technicalTerms = new Map([
        ['ai', 'artificial intelligence trí tuệ nhân tạo'],
        ['ml', 'machine learning học máy'],
        ['dl', 'deep learning học sâu'],
        ['nlp', 'natural language processing xử lý ngôn ngữ tự nhiên'],
        ['cv', 'computer vision thị giác máy tính'],
        ['iot', 'internet of things vạn vật kết nối'],
        ['blockchain', 'blockchain chuỗi khối cryptocurrency'],
        ['web', 'web website ứng dụng web frontend backend'],
        ['mobile', 'mobile di động android ios react native flutter'],
        ['data', 'data science phân tích dữ liệu big data'],
        ['cloud', 'cloud computing điện toán đám mây aws azure'],
        ['security', 'security bảo mật cybersecurity an ninh mạng'],
        ['network', 'network mạng máy tính networking'],
        ['database', 'database cơ sở dữ liệu sql nosql']
    ])

    // Stopwords to remove (Vietnamese)
    private readonly stopwords = new Set([
        'của',
        'là',
        'và',
        'có',
        'cho',
        'với',
        'trong',
        'về',
        'các',
        'được',
        'một',
        'những',
        'này',
        'đó',
        'khi',
        'từ',
        'theo',
        'để',
        'thì',
        'nên',
        'đã',
        'sẽ',
        'bởi',
        'vì',
        'nếu',
        'như',
        'mà',
        'hay',
        'hoặc',
        'nhưng',
        'vẫn',
        'còn',
        'giúp',
        'tìm',
        'gợi',
        'ý'
    ])

    private llm: ChatGroq

    constructor(
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {
        this.llm = new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            maxTokens: 200
        })
    }

    /**
     * Parse query into structured format
     */
    async parseQuery(query: string): Promise<ParsedQuery> {
        const personNames = this.extractPersonNames(query)
        const hasNameEntity = personNames.length > 0

        // Extract concepts (remove person names from query)
        let conceptText = query
        personNames.forEach((name) => {
            conceptText = conceptText.replace(new RegExp(name, 'gi'), '')
        })

        const concepts = this.extractConcepts(conceptText)

        return {
            personNames,
            concepts,
            rawQuery: query,
            hasNameEntity
        }
    }

    /**
     * Extract person names using regex patterns
     */
    private extractPersonNames(query: string): string[] {
        const names = new Set<string>()

        // Try all patterns
        this.vietnameseNamePatterns.forEach((pattern) => {
            const matches = query.matchAll(pattern)
            for (const match of matches) {
                const name = (match[1] || match[0]).trim()
                if (this.isLikelyPersonName(name)) {
                    names.add(name)
                }
            }
        })

        return Array.from(names)
    }

    /**
     * Validate if extracted string is likely a person name
     */
    private isLikelyPersonName(text: string): boolean {
        // Must have at least 2 words
        const words = text.split(/\s+/).filter((w) => w.length > 0)
        if (words.length < 2) return false

        // First word should be a common Vietnamese surname
        const firstWord = words[0].toLowerCase()
        if (!this.commonSurnames.has(firstWord)) {
            // Fallback: check if it looks like a capitalized name
            if (!/^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(words[0])) {
                return false
            }
        }

        // Should not contain technical terms
        const lowerText = text.toLowerCase()
        for (const [term] of this.technicalTerms) {
            if (lowerText.includes(term)) return false
        }

        // Should not be too long (> 5 words is unlikely a name)
        if (words.length > 5) return false

        return true
    }

    /**
     * Extract concepts/keywords from query
     */
    private extractConcepts(text: string): string[] {
        const concepts = new Set<string>()

        // Expand technical abbreviations
        const lowerText = text.toLowerCase()
        this.technicalTerms.forEach((expansion, term) => {
            if (lowerText.includes(term)) {
                concepts.add(term)
                // Add expansion terms
                expansion.split(/\s+/).forEach((word) => {
                    if (word.length > 2 && !this.stopwords.has(word)) {
                        concepts.add(word)
                    }
                })
            }
        })

        // Extract words (remove stopwords)
        const words = text
            .toLowerCase()
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 2 && !this.stopwords.has(w))

        words.forEach((word) => concepts.add(word))

        return Array.from(concepts)
    }

    /**
     * Fallback: Use LLM to parse query if regex fails
     */
    async parseWithLLM(query: string): Promise<ParsedQuery> {
        const prompt = `Bạn là chuyên gia phân tích câu truy vấn tìm kiếm giảng viên.

Câu truy vấn: "${query}"

Hãy phân tích và trích xuất:
1. Tên người (nếu có) - tên giảng viên cụ thể
2. Các khái niệm/chuyên môn - lĩnh vực, kỹ năng, keywords

Trả về JSON:
{
  "personNames": ["<tên người>"],
  "concepts": ["<khái niệm 1>", "<khái niệm 2>"]
}

VÍ DỤ:
Input: "Lê Văn Tuấn chuyên ngành AI"
Output: {"personNames": ["Lê Văn Tuấn"], "concepts": ["AI", "trí tuệ nhân tạo", "chuyên ngành"]}

Input: "giảng viên chuyên về blockchain"
Output: {"personNames": [], "concepts": ["blockchain", "chuỗi khối", "cryptocurrency"]}

Chỉ trả về JSON, KHÔNG giải thích.`

        try {
            const response = await this.llm.invoke(prompt)
            const content = response.content.toString().trim()

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response')
            }

            const parsed = JSON.parse(jsonMatch[0])

            return {
                personNames: parsed.personNames || [],
                concepts: parsed.concepts || [],
                rawQuery: query,
                hasNameEntity: (parsed.personNames || []).length > 0
            }
        } catch (error) {
            console.error('❌ LLM query parsing failed:', error)
            // Fallback to regex-based parsing
            return this.parseQuery(query)
        }
    }

    /**
     * Build semantic query from parsed data
     * - Reduces weight of person names
     * - Boosts concepts with expansions
     */
    buildSemanticQuery(parsed: ParsedQuery): string {
        const parts: string[] = []

        // Add concepts (with expansions) - high weight
        parsed.concepts.forEach((concept) => {
            const expansion = this.technicalTerms.get(concept.toLowerCase())
            if (expansion) {
                parts.push(expansion)
            } else {
                parts.push(concept)
            }
        })

        // Add raw query for context
        parts.push(parsed.rawQuery)

        // Add person names with reduced frequency (only once at end)
        if (parsed.hasNameEntity) {
            parts.push(...parsed.personNames)
        }

        return parts.filter(Boolean).join(' ')
    }

    /**
     * Normalize Vietnamese text for keyword matching
     */
    normalizeVietnamese(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .trim()
    }

    /**
     * Check if two names are similar (fuzzy match)
     */
    areNamesSimilar(name1: string, name2: string, threshold: number = 0.8): boolean {
        const normalized1 = this.normalizeVietnamese(name1)
        const normalized2 = this.normalizeVietnamese(name2)

        // Exact match after normalization
        if (normalized1 === normalized2) return true

        // Jaccard similarity on words
        const words1 = new Set(normalized1.split(/\s+/))
        const words2 = new Set(normalized2.split(/\s+/))

        const intersection = new Set([...words1].filter((w) => words2.has(w)))
        const union = new Set([...words1, ...words2])

        const similarity = intersection.size / union.size

        return similarity >= threshold
    }
}
