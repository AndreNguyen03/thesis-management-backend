import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class RerankerService {
    private readonly logger = new Logger(RerankerService.name)

    // Vietnamese stopwords đầy đủ
    private readonly VIETNAMESE_STOPWORDS = new Set([
        // Common stopwords
        'và',
        'của',
        'cho',
        'với',
        'là',
        'các',
        'một',
        'được',
        'trong',
        'khi',
        'về',
        'theo',
        'như',
        'này',
        'đó',
        'nào',
        'có',
        'không',
        'từ',
        'phải',
        'nên',
        'rất',
        'cũng',
        'đã',
        'sẽ',
        'thì',
        'mà',
        'ở',
        'bởi',
        'vì',
        'để',
        'nếu',
        'thì',
        'hay',
        'hoặc',
        'vẫn',
        'lại',
        'ra',
        'vào',
        'lên',
        'xuống',
        'qua',
        'lại',
        'đến',
        'từ',
        'trên',
        'dưới',
        'trước',
        'sau',
        'ngoài',

        // Academic stopwords
        'đề',
        'tài',
        'sinh',
        'viên',
        'nghiên',
        'cứu',
        'khoa',
        'học',
        'hệ',
        'thống',
        'ứng',
        'dụng',
        'phát',
        'triển',
        'xây',
        'dựng',
        'quản',
        'lý',
        'công',
        'nghệ',
        'thông',
        'tin',
        'trường',
        'đại',
        'học',
        'giảng',
        'viên',
        'bài',
        'tập',
        'đồ',
        'án',
        'luận',
        'văn',
        'khóa',
        'luận',
        'tốt',
        'nghiệp',

        // General stopwords
        'tôi',
        'bạn',
        'anh',
        'chị',
        'em',
        'chúng',
        'ta',
        'họ',
        'mình',
        'ai',
        'gì',
        'nào',
        'sao',
        'bao',
        'giờ',
        'đâu',
        'nơi',
        'thế',
        'nào',
        'tại',
        'sao',

        // Pronouns
        'nó',
        'bà',
        'ông',
        'cô',
        'chú',
        'bác',
        'dì',
        'cậu',
        'mợ',

        // Articles
        'một',
        'những',
        'các',
        'mấy',
        'vài'
    ])

    // Domain keywords với weights (1.0-2.0)
    private readonly DOMAIN_KEYWORDS = new Map([
        // AI/ML (High priority)
        ['ai', 2.0],
        ['machine learning', 2.0],
        ['deep learning', 2.0],
        ['artificial intelligence', 2.0],
        ['neural network', 1.8],
        ['computer vision', 1.8],
        ['natural language processing', 1.8],
        ['nlp', 1.8],
        ['data mining', 1.7],
        ['reinforcement learning', 1.7],

        // Web Development
        ['web', 1.5],
        ['website', 1.5],
        ['frontend', 1.6],
        ['backend', 1.6],
        ['fullstack', 1.7],
        ['react', 1.8],
        ['vue', 1.8],
        ['angular', 1.8],
        ['nextjs', 1.7],
        ['nodejs', 1.8],
        ['express', 1.7],
        ['nestjs', 1.7],
        ['javascript', 1.7],
        ['typescript', 1.7],
        ['html', 1.3],
        ['css', 1.3],

        // Mobile
        ['mobile', 1.5],
        ['android', 1.8],
        ['ios', 1.8],
        ['flutter', 1.8],
        ['react native', 1.8],
        ['kotlin', 1.7],
        ['swift', 1.7],

        // Database
        ['database', 1.5],
        ['mongodb', 1.7],
        ['mysql', 1.7],
        ['postgresql', 1.7],
        ['sql', 1.6],
        ['nosql', 1.6],
        ['redis', 1.6],

        // Cloud & DevOps
        ['cloud', 1.6],
        ['aws', 1.8],
        ['azure', 1.8],
        ['gcp', 1.8],
        ['docker', 1.7],
        ['kubernetes', 1.7],
        ['devops', 1.7],
        ['ci/cd', 1.6],

        // Data Science
        ['data science', 1.8],
        ['data analysis', 1.7],
        ['big data', 1.7],
        ['data visualization', 1.6],
        ['statistics', 1.5],

        // Research & Academic
        ['research', 1.4],
        ['algorithm', 1.6],
        ['model', 1.5],
        ['analysis', 1.5],
        ['evaluation', 1.4],
        ['survey', 1.3],
        ['experiment', 1.4],
        ['methodology', 1.4],

        // Security
        ['security', 1.6],
        ['cybersecurity', 1.7],
        ['encryption', 1.6],
        ['authentication', 1.5],

        // Vietnamese specific tech terms
        ['xử lý ngôn ngữ tự nhiên', 1.8],
        ['học máy', 2.0],
        ['học sâu', 2.0],
        ['trí tuệ nhân tạo', 2.0],
        ['phân tích dữ liệu', 1.7],
        ['khoa học dữ liệu', 1.8]
    ])

    /**
     * Rerank topics based on lexical overlap
     */
    async rerank(
        topicSummaries: string[],
        studentSummary: string
    ): Promise<{
        scores: number[]
        matchedKeywords: string[][]
        explanations: string[]
    }> {
        const studentTokens = this.tokenize(studentSummary)

        const results = topicSummaries.map((topicSummary, index) => {
            const topicTokens = this.tokenize(topicSummary)

            // 1. Jaccard similarity
            const jaccardScore = this.calculateJaccardSimilarity(studentTokens, topicTokens)

            // 2. Keyword overlap với weights
            const keywordResult = this.calculateKeywordOverlap(studentTokens, topicTokens)

            // 3. N-gram overlap (bigrams)
            const bigramScore = this.calculateNgramOverlap(studentSummary, topicSummary, 2)

            // 4. Combine scores
            const finalScore = this.combineScores(jaccardScore, keywordResult.score, bigramScore)

            // 5. Generate explanation
            const explanation = this.generateExplanation(finalScore, keywordResult.matchedKeywords, jaccardScore)

            this.logDebug(index, jaccardScore, keywordResult.score, bigramScore, finalScore)

            return {
                score: finalScore,
                matchedKeywords: keywordResult.matchedKeywords,
                explanation
            }
        })

        return {
            scores: results.map((r) => r.score),
            matchedKeywords: results.map((r) => r.matchedKeywords),
            explanations: results.map((r) => r.explanation)
        }
    }

    /**
     * Tokenize text with Vietnamese support
     */
    private tokenize(text: string): Set<string> {
        if (!text || text.trim().length === 0) {
            return new Set()
        }

        return new Set(
            text
                .toLowerCase()
                // Normalize Vietnamese accents
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                // Split by whitespace and punctuation
                .split(/[\s\p{P}]+/u)
                .map((word) => word.trim())
                .filter((word) => word.length > 2 && !this.VIETNAMESE_STOPWORDS.has(word) && this.isValidToken(word))
            // Remove duplicates
        )
    }

    /**
     * Check if token is valid (contains letters/numbers)
     */
    private isValidToken(word: string): boolean {
        return /[\p{L}0-9]/u.test(word)
    }

    /**
     * Calculate Jaccard similarity
     */
    private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
        if (setA.size === 0 || setB.size === 0) {
            return 0
        }

        const intersection = [...setA].filter((x) => setB.has(x)).length
        const union = setA.size + setB.size - intersection

        return union > 0 ? intersection / union : 0
    }

    /**
     * Calculate keyword overlap với domain weights
     */
    private calculateKeywordOverlap(
        studentTokens: Set<string>,
        topicTokens: Set<string>
    ): { score: number; matchedKeywords: string[] } {
        const matchedKeywords: string[] = []
        let totalWeight = 0
        let maxPossibleWeight = 0

        // Convert to arrays for easier processing
        const studentArray = [...studentTokens]
        const topicArray = [...topicTokens]

        // Check each domain keyword
        for (const [keyword, weight] of this.DOMAIN_KEYWORDS.entries()) {
            // Check if keyword exists in student profile
            const studentHasKeyword = studentArray.some((token) => this.isKeywordMatch(token, keyword))

            // Check if keyword exists in topic
            const topicHasKeyword = topicArray.some((token) => this.isKeywordMatch(token, keyword))

            if (studentHasKeyword && topicHasKeyword) {
                matchedKeywords.push(keyword)
                totalWeight += weight
            }

            maxPossibleWeight += weight
        }

        // Calculate normalized score
        const score = maxPossibleWeight > 0 ? totalWeight / maxPossibleWeight : 0

        return {
            score: Math.min(score, 1),
            matchedKeywords
        }
    }

    /**
     * Check if token matches keyword (allows partial matches)
     */
    private isKeywordMatch(token: string, keyword: string): boolean {
        // Exact match
        if (token === keyword) {
            return true
        }

        // Contains match (e.g., "machinelearning" contains "machine learning")
        if (keyword.includes(' ')) {
            // For multi-word keywords, check if token contains any part
            const keywordParts = keyword.split(' ')
            return keywordParts.some((part) => token.includes(part))
        }

        // Token contains keyword or keyword contains token
        return token.includes(keyword) || keyword.includes(token)
    }

    /**
     * Calculate n-gram overlap
     */
    private calculateNgramOverlap(textA: string, textB: string, n: number): number {
        const ngramsA = this.extractNgrams(textA, n)
        const ngramsB = this.extractNgrams(textB, n)

        if (ngramsA.size === 0 || ngramsB.size === 0) {
            return 0
        }

        const intersection = [...ngramsA].filter((x) => ngramsB.has(x)).length
        const union = ngramsA.size + ngramsB.size - intersection

        return union > 0 ? intersection / union : 0
    }

    /**
     * Extract n-grams from text
     */
    private extractNgrams(text: string, n: number): Set<string> {
        const ngrams = new Set<string>()
        const tokens = [...this.tokenize(text)] // Convert to array

        for (let i = 0; i <= tokens.length - n; i++) {
            const ngram = tokens.slice(i, i + n).join(' ')
            ngrams.add(ngram)
        }

        return ngrams
    }

    /**
     * Combine different lexical scores
     */
    private combineScores(jaccardScore: number, keywordScore: number, bigramScore: number): number {
        // Weighted combination
        // Jaccard: 30%, Keywords: 50%, Bigrams: 20%
        const weightedScore = jaccardScore * 0.3 + keywordScore * 0.5 + bigramScore * 0.2

        // Apply non-linear scaling
        const scaledScore = this.applyNonLinearScaling(weightedScore)

        return Math.min(scaledScore, 1.0)
    }

    /**
     * Apply non-linear scaling to emphasize good matches
     */
    private applyNonLinearScaling(score: number): number {
        if (score < 0.2) {
            return score * 0.5 // Suppress very low scores
        } else if (score < 0.5) {
            return score * 1.0 // Keep as is
        } else if (score < 0.8) {
            return score * 1.2 // Boost medium scores
        } else {
            return Math.pow(score, 1.3) // Strong emphasis on high scores
        }
    }

    /**
     * Generate human-readable explanation
     */
    private generateExplanation(score: number, matchedKeywords: string[], jaccardScore: number): string {
        if (score >= 0.7) {
            if (matchedKeywords.length >= 3) {
                return `Tuyệt vời! Có ${matchedKeywords.length} từ khóa quan trọng trùng khớp`
            } else if (jaccardScore >= 0.5) {
                return 'Nội dung từ khóa tương đồng rất cao'
            }
            return 'Từ khóa trùng khớp rất tốt'
        } else if (score >= 0.5) {
            if (matchedKeywords.length > 0) {
                return `Tốt! Có ${matchedKeywords.length} từ khóa quan trọng trùng khớp`
            }
            return 'Từ khóa trùng khớp khá tốt'
        } else if (score >= 0.3) {
            if (matchedKeywords.length > 0) {
                return `Có ${matchedKeywords.length} từ khóa trùng khớp`
            }
            return 'Một số từ khóa trùng khớp'
        } else if (score >= 0.1) {
            return 'Ít từ khóa trùng khớp'
        } else {
            return 'Hầu như không có từ khóa trùng khớp'
        }
    }

    /**
     * Log debug information
     */
    private logDebug(
        index: number,
        jaccardScore: number,
        keywordScore: number,
        bigramScore: number,
        finalScore: number
    ): void {
        this.logger.debug({
            event: 'topic_reranked',
            topicIndex: index,
            scores: {
                jaccard: jaccardScore.toFixed(3),
                keyword: keywordScore.toFixed(3),
                bigram: bigramScore.toFixed(3),
                final: finalScore.toFixed(3)
            }
        })
    }

    /**
     * Get all domain keywords (for debugging)
     */
    getDomainKeywords(): Map<string, number> {
        return this.DOMAIN_KEYWORDS
    }

    /**
     * Get stopwords count (for debugging)
     */
    getStopwordsCount(): number {
        return this.VIETNAMESE_STOPWORDS.size
    }

    /**
     * Test tokenization
     */
    testTokenization(text: string): {
        original: string
        tokens: string[]
        filteredTokens: string[]
        removedStopwords: string[]
    } {
        const allTokens = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(/[\s\p{P}]+/u)
            .map((w) => w.trim())
            .filter((w) => w.length > 0)

        const filteredTokens = allTokens.filter(
            (w) => w.length > 2 && !this.VIETNAMESE_STOPWORDS.has(w) && this.isValidToken(w)
        )

        const removedStopwords = allTokens.filter((w) => this.VIETNAMESE_STOPWORDS.has(w) || w.length <= 2)

        return {
            original: text,
            tokens: allTokens,
            filteredTokens,
            removedStopwords
        }
    }
}
