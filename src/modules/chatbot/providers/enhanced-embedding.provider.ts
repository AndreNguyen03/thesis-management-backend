import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { GenerativeModel, GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import { googleAIConfig } from '../../../config/googleai.config'
import { ParsedQuery } from './query-parser.provider'

@Injectable()
export class EnhancedEmbeddingProvider {
    private genAI: GoogleGenerativeAI
    private embeddingModel: GenerativeModel

    // Technical abbreviations for expansion
    private readonly technicalAbbreviations = new Map([
        ['ai', 'AI artificial intelligence trí tuệ nhân tạo machine learning deep learning'],
        ['ml', 'ML machine learning học máy supervised learning unsupervised learning'],
        ['dl', 'DL deep learning học sâu neural network mạng nơ-ron'],
        ['nlp', 'NLP natural language processing xử lý ngôn ngữ tự nhiên text mining'],
        ['cv', 'CV computer vision thị giác máy tính image processing'],
        ['iot', 'IoT internet of things vạn vật kết nối embedded system sensor'],
        ['blockchain', 'blockchain chuỗi khối cryptocurrency smart contract web3 distributed ledger'],
        ['web', 'web website ứng dụng web frontend backend fullstack'],
        ['mobile', 'mobile di động android ios react native flutter app development'],
        ['data', 'data science phân tích dữ liệu big data analytics visualization'],
        ['cloud', 'cloud computing điện toán đám mây AWS azure GCP serverless'],
        ['security', 'security bảo mật cybersecurity an ninh mạng encryption'],
        ['network', 'network mạng máy tính networking protocol routing switching'],
        ['database', 'database cơ sở dữ liệu SQL NoSQL MongoDB PostgreSQL'],
        ['devops', 'DevOps CI/CD continuous integration deployment automation'],
        ['api', 'API application programming interface RESTful GraphQL microservices']
    ])

    constructor(
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfiguration: ConfigType<typeof googleAIConfig>
    ) {
        const apiKey = this.googleAIConfiguration.apiKey
        this.genAI = new GoogleGenerativeAI(apiKey)
        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' })
    }

    /**
     * Standard embedding (backward compatible with old code)
     */
    async getEmbedding(text: string): Promise<number[]> {
        const embedding = await this.embeddingModel.embedContent(text)
        return embedding.embedding.values
    }

    /**
     * Enhanced embedding with preprocessing
     */
    async getEnhancedEmbedding(text: string, options?: { expandAbbreviations?: boolean }): Promise<number[]> {
        let processed = text

        // Expand technical abbreviations
        if (options?.expandAbbreviations !== false) {
            processed = this.expandAbbreviations(processed)
        }

        // Clean and normalize
        processed = this.normalizeText(processed)

        const embedding = await this.embeddingModel.embedContent(processed)
        return embedding.embedding.values
    }

    /**
     * Embed query with structured parsing
     * - Reduces weight of person names
     * - Boosts technical concepts
     */
    async embedParsedQuery(parsed: ParsedQuery): Promise<number[]> {
        const parts: string[] = []

        // 1. Expand and add concepts (high priority)
        parsed.concepts.forEach((concept) => {
            const expansion = this.technicalAbbreviations.get(concept.toLowerCase())
            if (expansion) {
                // Add expanded version (repeated for weight)
                parts.push(expansion)
                parts.push(expansion) // Repeat once more for emphasis
            } else {
                parts.push(concept)
            }
        })

        // 2. Add raw query for context
        parts.push(parsed.rawQuery)

        // 3. Add person names (low weight - only once at end)
        if (parsed.hasNameEntity) {
            parts.push(...parsed.personNames)
        }

        // 4. Add domain context
        parts.push('giảng viên hướng dẫn chuyên môn nghiên cứu')

        const queryText = parts.filter(Boolean).join(' ')
        return await this.getEmbedding(queryText)
    }

    /**
     * Embed topic/document with field boosting
     */
    async embedTopicWithBoost(fields: {
        title?: string
        titleEng?: string
        description?: string
        fields?: string[]
        requirements?: string[]
        keywords?: string[]
    }): Promise<number[]> {
        const parts: string[] = []

        // Title (highest priority - repeat 3x)
        if (fields.title) {
            const expanded = this.expandAbbreviations(fields.title)
            parts.push(expanded, expanded, expanded)
        }

        if (fields.titleEng) {
            const expanded = this.expandAbbreviations(fields.titleEng)
            parts.push(expanded, expanded)
        }

        // Fields/keywords (high priority - repeat 2x)
        if (fields.fields?.length) {
            const fieldsText = fields.fields.join(' ')
            const expanded = this.expandAbbreviations(fieldsText)
            parts.push(expanded, expanded)
        }

        if (fields.keywords?.length) {
            const keywordsText = fields.keywords.join(' ')
            const expanded = this.expandAbbreviations(keywordsText)
            parts.push(expanded, expanded)
        }

        // Requirements (medium priority - repeat 1x)
        if (fields.requirements?.length) {
            const reqText = fields.requirements.join(' ')
            parts.push(this.expandAbbreviations(reqText))
        }

        // Description (standard priority)
        if (fields.description) {
            parts.push(this.expandAbbreviations(fields.description))
        }

        const text = parts.filter(Boolean).join('. ')
        return await this.getEmbedding(text)
    }

    /**
     * Embed lecturer profile with field boosting
     */
    async embedLecturerProfile(profile: {
        fullName: string
        title?: string
        bio?: string
        researchInterests?: string[]
        areaInterest?: string[]
        publications?: Array<{ title: string }>
    }): Promise<number[]> {
        const parts: string[] = []

        // Name (repeat 3x for identity)
        parts.push(profile.fullName, profile.fullName, profile.fullName)

        // Title
        if (profile.title) {
            parts.push(profile.title, profile.title)
        }

        // Research interests (highest priority - repeat 3x)
        if (profile.researchInterests?.length) {
            const interests = profile.researchInterests.join(', ')
            const expanded = this.expandAbbreviations(interests)
            parts.push(expanded, expanded, expanded)
        }

        // Area of interest (repeat 2x)
        if (profile.areaInterest?.length) {
            const areas = profile.areaInterest.join(', ')
            const expanded = this.expandAbbreviations(areas)
            parts.push(expanded, expanded)
        }

        // Bio
        if (profile.bio) {
            parts.push(this.expandAbbreviations(profile.bio))
        }

        // Publications (extract titles and keywords)
        if (profile.publications?.length) {
            const pubTitles = profile.publications.slice(0, 5).map((p) => p.title)
            const pubText = pubTitles.join('. ')
            parts.push(this.expandAbbreviations(pubText))

            // Extract keywords from publication titles
            const keywords = this.extractKeywords(pubText)
            if (keywords.length > 0) {
                parts.push(keywords.join(' '))
            }
        }

        const text = parts.filter(Boolean).join('. ')
        return await this.getEmbedding(text)
    }

    /**
     * Batch embedding with retry logic
     */
    async embedBatch(texts: string[], maxRetries: number = 3): Promise<number[][]> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const embeddings = await Promise.all(texts.map((text) => this.getEmbedding(text)))
                return embeddings
            } catch (error) {
                if (attempt === maxRetries - 1) throw error
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
            }
        }
        return []
    }

    /**
     * Expand technical abbreviations in text
     */
    private expandAbbreviations(text: string): string {
        let expanded = text

        this.technicalAbbreviations.forEach((expansion, abbr) => {
            // Match whole word only (case insensitive)
            const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
            if (regex.test(expanded)) {
                // Replace with both original and expansion
                expanded = expanded.replace(regex, `${abbr} ${expansion}`)
            }
        })

        return expanded
    }

    /**
     * Normalize text (clean whitespace, remove special chars)
     */
    private normalizeText(text: string): string {
        return (
            text
                // Remove HTML tags
                .replace(/<[^>]*>/g, ' ')
                // Remove extra whitespace
                .replace(/\s+/g, ' ')
                // Trim
                .trim()
        )
    }

    /**
     * Extract keywords from text (words > 4 chars)
     */
    private extractKeywords(text: string): string[] {
        const words = text
            .toLowerCase()
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 4)

        // Get unique keywords
        return Array.from(new Set(words)).slice(0, 20)
    }

    /**
     * Get embedding with retry and fallback
     */
    async getEmbeddingWithRetry(text: string, maxRetries: number = 3): Promise<number[]> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.getEmbedding(text)
            } catch (error) {
                console.error(`❌ Embedding attempt ${attempt + 1} failed:`, error.message)
                if (attempt === maxRetries - 1) throw error
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
            }
        }
        return []
    }
}
