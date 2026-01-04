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
        ['khoa học dữ liệu', 1.8],
        ['.net', 1.8],
        ['c#', 1.8],
        ['c sharp', 1.8],
        ['aws', 1.8],
        ['c++', 1.7],
        ['git', 1.5],
        ['java', 1.8],
        ['javascript', 1.8],
        ['mongodb', 1.8],
        ['nodejs', 1.8],
        ['node.js', 1.8],
        ['sql', 1.7],
        ['reactjs', 1.8],
        ['react', 1.8],
        ['nestjs', 1.8],
        ['postgresql', 1.8],

        // Thêm các interests mapping
        ['devops', 2.0],
        ['tự động hóa', 1.8],
        ['triển khai', 1.7],
        ['trí tuệ nhân tạo', 2.0],
        ['ai', 2.0],
        ['học máy', 2.0],
        ['machine learning', 2.0],
        ['microservices', 1.9],
        ['kiến trúc microservices', 2.0],
        ['hệ thống phân tán', 1.8],
        ['tối ưu hiệu năng', 1.7],
        ['phát triển web', 1.8],
        ['ứng dụng web', 1.8]
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

            // 2. Keyword overlap with weights
            const keywordResult = this.calculateKeywordOverlap(studentTokens, topicTokens)

            // 3. N-gram overlap (bigrams and trigrams)
            const bigramScore = this.calculateNgramOverlap(studentSummary, topicSummary, 2)
            const trigramScore = this.calculateNgramOverlap(studentSummary, topicSummary, 3)

            // 4. Phrase matching score
            const phraseScore = this.calculatePhraseOverlap(studentSummary, topicSummary)

            // 5. Combine scores
            const baseScore = this.combineScores(jaccardScore, keywordResult.score, bigramScore, trigramScore)

            // Boost score if phrase matching is good
            const finalScore = baseScore + phraseScore * 0.2

            // 6. Generate explanation
            const explanation = this.generateExplanation(
                finalScore,
                keywordResult.matchedKeywords,
                jaccardScore,
                phraseScore
            )

            this.logDebug(index, jaccardScore, keywordResult.score, bigramScore, trigramScore, finalScore, phraseScore)

            return {
                score: Math.min(finalScore, 1.0),
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
        // Normalize both
        const normalizedToken = token.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9\s]/g, '')

        // Check exact match after normalization
        if (normalizedToken === normalizedKeyword.replace(/\s+/g, '')) {
            return true
        }

        // For multi-word keywords
        if (normalizedKeyword.includes(' ')) {
            // Option 1: All parts must be present (strict)
            const keywordParts = normalizedKeyword.split(/\s+/)
            const allPartsPresent = keywordParts.every(
                (part) => normalizedToken.includes(part) || normalizedToken.replace(part, '') !== normalizedToken
            )

            if (allPartsPresent) return true

            // Option 2: Phrase matching
            const keywordWithoutSpaces = normalizedKeyword.replace(/\s+/g, '')
            if (normalizedToken.includes(keywordWithoutSpaces)) {
                return true
            }
        }

        // Partial match for compound words
        if (normalizedKeyword.length > 3 && normalizedToken.length > 3) {
            // Check if one is substring of another (with threshold)
            const minLength = Math.min(normalizedToken.length, normalizedKeyword.length)
            const maxLength = Math.max(normalizedToken.length, normalizedKeyword.length)

            if (minLength / maxLength > 0.7) {
                // 70% similarity
                return normalizedToken.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedToken)
            }
        }

        return false
    }

    /**
     * Add trigram overlap
     */
    private calculateTrigramOverlap(textA: string, textB: string): number {
        return this.calculateNgramOverlap(textA, textB, 3)
    }

    /**
     * Improved score combination
     */
    private combineScores(
        jaccardScore: number,
        keywordScore: number,
        bigramScore: number,
        trigramScore: number = 0
    ): number {
        // Dynamic weights based on score quality
        let jaccardWeight = 0.2
        let keywordWeight = 0.5
        let bigramWeight = 0.15
        let trigramWeight = 0.15

        // If keyword score is high, give it more weight
        if (keywordScore > 0.3) {
            keywordWeight = 0.6
            jaccardWeight = 0.15
        }

        // If n-gram scores are more reliable
        const ngramReliability = (bigramScore + trigramScore) / 2
        if (ngramReliability > 0.4) {
            bigramWeight = 0.2
            trigramWeight = 0.2
            keywordWeight = 0.4
        }

        const weightedScore =
            jaccardScore * jaccardWeight +
            keywordScore * keywordWeight +
            bigramScore * bigramWeight +
            trigramScore * trigramWeight

        return this.applyNonLinearScaling(weightedScore)
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
    private logDebug(
        index: number,
        jaccardScore: number,
        keywordScore: number,
        bigramScore: number,
        trigramScore: number,
        phraseScore: number,
        finalScore: number
    ): void {
        this.logger.debug({
            event: 'topic_reranked',
            topicIndex: index,
            timestamp: new Date().toISOString(),
            scores: {
                jaccard: parseFloat(jaccardScore.toFixed(3)),
                keyword: parseFloat(keywordScore.toFixed(3)),
                bigram: parseFloat(bigramScore.toFixed(3)),
                trigram: parseFloat(trigramScore.toFixed(3)),
                phrase: parseFloat(phraseScore.toFixed(3)),
                final: parseFloat(finalScore.toFixed(3))
            },
            scoreComponents: {
                jaccardPercent: `${(jaccardScore * 100).toFixed(1)}%`,
                keywordPercent: `${(keywordScore * 100).toFixed(1)}%`,
                bigramPercent: `${(bigramScore * 100).toFixed(1)}%`,
                trigramPercent: `${(trigramScore * 100).toFixed(1)}%`,
                phrasePercent: `${(phraseScore * 100).toFixed(1)}%`
            },
            interpretation: this.getScoreInterpretation(finalScore)
        })
    }

    private generateExplanation(
        score: number,
        matchedKeywords: string[],
        jaccardScore: number,
        phraseScore: number
    ): string {
        const scorePercent = (score * 100).toFixed(1)
        const keywordCount = matchedKeywords.length

        // Tạo description chi tiết hơn
        let baseExplanation = ''
        let details: string[] = []

        if (score >= 0.8) {
            baseExplanation = '🔥 Tuyệt vời! Độ tương đồng từ khóa rất cao'
            if (keywordCount >= 4) {
                details.push(`${keywordCount} từ khóa quan trọng trùng khớp`)
            }
            if (jaccardScore >= 0.6) {
                details.push(`Độ tương đồng tổng thể cao (${(jaccardScore * 100).toFixed(0)}%)`)
            }
            if (phraseScore >= 0.5) {
                details.push(`Cụm từ chuyên ngành trùng khớp tốt`)
            }
        } else if (score >= 0.7) {
            baseExplanation = '✅ Rất tốt! Từ khóa tương đồng cao'
            if (keywordCount >= 3) {
                details.push(`${keywordCount} từ khóa chính trùng khớp`)
            }
            if (jaccardScore >= 0.5) {
                details.push(`Nội dung có nhiều điểm chung`)
            }
        } else if (score >= 0.6) {
            baseExplanation = '👍 Tốt! Phù hợp với hồ sơ'
            if (keywordCount >= 2) {
                details.push(`${keywordCount} từ khóa quan trọng phù hợp`)
            }
            if (phraseScore >= 0.3) {
                details.push(`Có cụm từ chuyên môn tương đồng`)
            }
        } else if (score >= 0.5) {
            baseExplanation = '📊 Khá phù hợp'
            if (keywordCount > 0) {
                details.push(`${keywordCount} từ khóa phù hợp`)
            } else if (jaccardScore >= 0.4) {
                details.push(`Nội dung có một số điểm chung`)
            }
            details.push(`Có thể xem xét thêm`)
        } else if (score >= 0.4) {
            baseExplanation = 'ℹ️ Có thể tham khảo'
            if (keywordCount > 0) {
                details.push(`Có ${keywordCount} từ khóa liên quan`)
            }
            details.push(`Mức độ phù hợp trung bình`)
        } else if (score >= 0.3) {
            baseExplanation = '👀 Hạn chế'
            if (keywordCount > 0) {
                details.push(`Chỉ có ${keywordCount} từ khóa liên quan`)
            }
            details.push(`Độ tương đồng thấp`)
        } else if (score >= 0.2) {
            baseExplanation = '⚠️ Ít liên quan'
            details.push(`Rất ít từ khóa trùng khớp`)
            details.push(`Cần xem xét kỹ yêu cầu đề tài`)
        } else if (score >= 0.1) {
            baseExplanation = '🔍 Hầu như không liên quan'
            details.push(`Không có từ khóa quan trọng trùng khớp`)
        } else {
            baseExplanation = '🚫 Không phù hợp'
            details.push(`Hồ sơ và đề tài không có điểm chung`)
        }

        // Thêm thông tin chất lượng matching
        if (keywordCount > 0) {
            const importantKeywords = matchedKeywords.filter((kw) => {
                const keywordWeight = this.DOMAIN_KEYWORDS.get(kw)
                // Check both: keyword exists AND weight >= 1.7
                return keywordWeight !== undefined && keywordWeight >= 1.7
            })

            if (importantKeywords.length > 0) {
                details.push(
                    `Có ${importantKeywords.length} từ khóa quan trọng: ${importantKeywords.slice(0, 3).join(', ')}${importantKeywords.length > 3 ? '...' : ''}`
                )
            }
        }

        // Ghép explanation
        let explanation = `${baseExplanation} (${scorePercent}%)`
        if (details.length > 0) {
            explanation += `. ${details.join('. ')}.`
        }

        // Thêm gợi ý dựa trên score
        if (score < 0.5) {
            explanation += ` Gợi ý: Kiểm tra yêu cầu kỹ thuật cụ thể của đề tài.`
        } else if (score < 0.7) {
            explanation += ` Gợi ý: Xem xét mô tả chi tiết để đánh giá phù hợp.`
        }

        return explanation
    }

    private getScoreInterpretation(score: number): string {
        if (score >= 0.8) return 'excellent_match'
        if (score >= 0.7) return 'very_good_match'
        if (score >= 0.6) return 'good_match'
        if (score >= 0.5) return 'acceptable_match'
        if (score >= 0.4) return 'below_average_match'
        if (score >= 0.3) return 'poor_match'
        if (score >= 0.2) return 'very_poor_match'
        return 'no_match'
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

    private calculatePhraseOverlap(textA: string, textB: string): number {
        const phrasesA = this.extractPhrases(textA)
        const phrasesB = this.extractPhrases(textB)

        if (phrasesA.size === 0 || phrasesB.size === 0) return 0

        let matches = 0
        for (const phraseA of phrasesA) {
            for (const phraseB of phrasesB) {
                if (this.similarPhrases(phraseA, phraseB)) {
                    matches++
                    break
                }
            }
        }

        return matches / Math.max(phrasesA.size, phrasesB.size)
    }

    /**
     * Extract meaningful phrases (3-5 words)
     */
    private extractPhrases(text: string): Set<string> {
        const phrases = new Set<string>()
        const tokens = [...this.tokenize(text)]

        // Extract 3-5 word phrases
        for (let n = 3; n <= 5; n++) {
            for (let i = 0; i <= tokens.length - n; i++) {
                const phrase = tokens.slice(i, i + n).join(' ')
                if (phrase.length >= 10) {
                    // Minimum length
                    phrases.add(phrase)
                }
            }
        }

        return phrases
    }

    /**
     * Check if two phrases are similar
     */
    private similarPhrases(phraseA: string, phraseB: string): boolean {
        const a = phraseA.toLowerCase()
        const b = phraseB.toLowerCase()

        // Exact match
        if (a === b) return true

        // One contains the other
        if (a.includes(b) || b.includes(a)) return true

        // Jaccard similarity for phrases
        const wordsA = new Set(a.split(' '))
        const wordsB = new Set(b.split(' '))
        const intersection = [...wordsA].filter((x) => wordsB.has(x)).length
        const union = wordsA.size + wordsB.size - intersection

        return intersection / union > 0.6 // 60% overlap
    }

    /**
     * Normalize DOMAIN_KEYWORDS
     */
    private normalizeDomainKeywords(): void {
        // Remove duplicates and standardize
        const normalized = new Map<string, number>()

        for (const [keyword, weight] of this.DOMAIN_KEYWORDS.entries()) {
            const normalizedKey = keyword
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim()

            // Keep the highest weight if duplicate
            if (!normalized.has(normalizedKey) || normalized.get(normalizedKey)! < weight) {
                normalized.set(normalizedKey, weight)
            }
        }

        // Update DOMAIN_KEYWORDS
        this.DOMAIN_KEYWORDS.clear()
        normalized.forEach((weight, key) => this.DOMAIN_KEYWORDS.set(key, weight))
    }

    /**
     * Initialize with normalized keywords
     */
    constructor() {
        this.normalizeDomainKeywords()
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
