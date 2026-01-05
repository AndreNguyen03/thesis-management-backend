import { Injectable } from '@nestjs/common'

@Injectable()
export class Reranker {
    constructor() {}
    
    /**
     * Rerank dựa trên lexical overlap (Jaccard)
     * Dùng như signal phụ, KHÔNG thay thế semantic score
     */
    async rerank(topicSummaries: string[], studentSummary: string): Promise<number[]> {
        const studentTokens = this.tokenize(studentSummary)

        return topicSummaries.map((topicSummary) => {
            const topicTokens = this.tokenize(topicSummary)

            const intersection = [...studentTokens].filter((w) => topicTokens.has(w))

            const unionSize = studentTokens.size + topicTokens.size - intersection.length

            const jaccard = unionSize > 0 ? intersection.length / unionSize : 0

            /**
             * Domain keyword boost
             */
            const keywordBoost = this.hasImportantOverlap(intersection) ? 0.15 : 0

            /**
             * Scale rerank score
             * Vì jaccard thường rất nhỏ
             */
            const rerankScore = Math.min(jaccard * 2 + keywordBoost, 1)

            return rerankScore
        })
    }

    /**
     * Tokenize + normalize tiếng Việt
     */
    private tokenize(text: string): Set<string> {
        return new Set(
            text
                .toLowerCase()
                .split(/\s+/)
                .map((w) => w.replace(/[^\p{L}]/gu, ''))
                .filter((w) => w.length > 2 && !this.stopWords.has(w))
        )
    }

    /**
     * Keyword quan trọng trong domain đề tài
     */
    private hasImportantOverlap(words: string[]): boolean {
        const importantKeywords = [
            'ai',
            'ml',
            'data',
            'machine',
            'learning',
            'web',
            'backend',
            'frontend',
            'nghiên',
            'cứu',
            'thuật',
            'toán',
            'kỹ',
            'năng'
        ]

        return words.some((w) => importantKeywords.includes(w))
    }

    /**
     * Stopwords đơn giản
     */
    private stopWords = new Set([
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
        'sinh',
        'viên',
        'đề',
        'tài'
    ])
}
