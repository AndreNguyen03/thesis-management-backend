import { Injectable, Inject } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { ChatGroq } from '@langchain/groq'
import groqConfig from '../../../config/groq.config'
import { LecturerSearchResult } from '../../knowledge-source/application/hybrid-lecturer-search.provider'

export interface RerankedResult extends LecturerSearchResult {
    rerankScore: number // 0-1: LLM-generated relevance score
    rerankReason: string // Explanation for ranking
    originalRank: number // Original position before reranking
    finalRank?: number // Final position after reranking
}

@Injectable()
export class LecturerRerankerProvider {
    private llm: ChatGroq

    constructor(
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {
        this.llm = new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2, // Low for factual reasoning
            maxTokens: 2000 // Enough for ranking multiple candidates
        })
    }

    /**
     * Rerank search results using LLM
     * Considers: name match, expertise alignment, experience (publications, title)
     */
    async rerank(query: string, results: LecturerSearchResult[], topK: number = 10): Promise<RerankedResult[]> {
        if (results.length === 0) return []

        // Take top candidates for LLM evaluation (max 20 to avoid token limit)
        const candidates = results.slice(0, Math.min(20, results.length))

        console.log(`🎯 [RERANKER] Reranking ${candidates.length} candidates for query: "${query}"`)

        try {
            // Build prompt with candidate information
            const prompt = this.buildRerankPrompt(query, candidates)

            // Call LLM
            const response = await this.llm.invoke(prompt)
            const content = response.content.toString().trim()

            // Parse LLM response
            const rerankedData = this.parseLLMResponse(content)

            // Merge with original results
            const rerankedResults = this.mergeRerankedScores(candidates, rerankedData)

            // Filter by minimum score threshold (80%)
            const RERANK_THRESHOLD = 0.80
            const filteredResults = rerankedResults.filter(r => r.rerankScore >= RERANK_THRESHOLD)

            // Sort by rerank score and return top K
            filteredResults.sort((a, b) => b.rerankScore - a.rerankScore)

            // Assign final ranks
            filteredResults.forEach((r, idx) => {
                r.finalRank = idx + 1
            })

            console.log(`✅ [RERANKER] Reranking completed. Filtered ${filteredResults.length}/${rerankedResults.length} with score >= ${RERANK_THRESHOLD}. Top result: ${filteredResults[0]?.fullName}`)

            return filteredResults.slice(0, topK)
        } catch (error) {
            console.error('❌ [RERANKER] LLM reranking failed:', error)
            // Fallback: return original results with original scores
            return this.fallbackRerank(results, topK)
        }
    }

    /**
     * Build prompt for LLM reranking
     */
    private buildRerankPrompt(query: string, candidates: LecturerSearchResult[]): string {
        const candidatesText = candidates
            .map((c, idx) => {
                const publications = c.publications?.slice(0, 3) || []
                const pubText =
                    publications.length > 0
                        ? publications.map((p) => `"${p.title}" (${p.year}, ${p.citations || 0} citations)`).join('; ')
                        : 'Không có'

                return `
${idx + 1}. ${c.fullName} (${c.title || 'Giảng viên'})
   - Email: ${c.email}
   - Bio: ${c.bio?.substring(0, 150) || 'Không có'}${c.bio && c.bio.length > 150 ? '...' : ''}
   - Lĩnh vực nghiên cứu: ${c.researchInterests?.join(', ') || 'Không có'}
   - Lĩnh vực quan tâm: ${c.areaInterest?.join(', ') || 'Không có'}
   - Khoa: ${c.faculty?.name || 'Không có'}
   - Công trình tiêu biểu: ${pubText}
   - Match type: ${c.matchType}
   - Original score: ${c.finalScore.toFixed(3)} (name: ${c.nameMatchScore.toFixed(2)}, semantic: ${c.semanticScore.toFixed(2)})
`.trim()
            })
            .join('\n\n')

        return `Bạn là chuyên gia đánh giá độ phù hợp giữa giảng viên và yêu cầu tìm kiếm.

QUERY TÌM KIẾM: "${query}"

DANH SÁCH GIẢNG VIÊN (đã được sắp xếp sơ bộ):
${candidatesText}

NHIỆM VỤ:
Đánh giá và xếp hạng lại các giảng viên dựa trên:
1. **Độ khớp tên** (nếu query có tên cụ thể):
   - Exact match → điểm cao nhất
   - Fuzzy match → điểm cao
   - Không match → chỉ xét semantic

2. **Độ liên quan chuyên môn**:
   - Lĩnh vực nghiên cứu/quan tâm có overlap với query?
   - Bio có đề cập đến concepts trong query?
   - Mức độ cụ thể của chuyên môn

3. **Kinh nghiệm & uy tín**:
   - Học hàm (GS, PGS, TS)
   - Số lượng và chất lượng công trình (citations)
   - Tính gần đây của nghiên cứu

CHỈ TRẢ VỀ JSON ARRAY (không giải thích):
[
  {
    "index": <index từ danh sách trên, bắt đầu từ 1>,
    "score": <0.0-1.0, điểm phù hợp>,
    "reason": "<1-2 câu giải thích ngắn gọn tại sao phù hợp, bằng tiếng Việt>"
  }
]

XẾP HẠNG TOP ${Math.min(10, candidates.length)} GIẢNG VIÊN PHÙ HỢP NHẤT.`
    }

    /**
     * Parse LLM response (JSON array)
     */
    private parseLLMResponse(content: string): Array<{ index: number; score: number; reason: string }> {
        try {
            // Extract JSON array from response
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (!jsonMatch) {
                throw new Error('No JSON array found in LLM response')
            }

            const parsed = JSON.parse(jsonMatch[0])

            if (!Array.isArray(parsed)) {
                throw new Error('LLM response is not an array')
            }

            return parsed.map((item) => ({
                index: item.index,
                score: Math.max(0, Math.min(1, item.score)), // Clamp to 0-1
                reason: item.reason || 'Phù hợp với yêu cầu tìm kiếm'
            }))
        } catch (error) {
            console.error('❌ [RERANKER] Failed to parse LLM response:', error)
            console.error('Response content:', content)
            throw error
        }
    }

    /**
     * Merge LLM rerank scores with original results
     */
    private mergeRerankedScores(
        candidates: LecturerSearchResult[],
        rerankedData: Array<{ index: number; score: number; reason: string }>
    ): RerankedResult[] {
        return candidates.map((candidate, idx) => {
            const rerankedItem = rerankedData.find((r) => r.index === idx + 1)

            if (rerankedItem) {
                return {
                    ...candidate,
                    rerankScore: rerankedItem.score,
                    rerankReason: rerankedItem.reason,
                    originalRank: idx + 1
                }
            } else {
                // Not included in LLM reranking (probably filtered out)
                return {
                    ...candidate,
                    rerankScore: candidate.finalScore * 0.5, // Penalty for not being selected
                    rerankReason: 'Không nằm trong top candidates theo LLM',
                    originalRank: idx + 1
                }
            }
        })
    }

    /**
     * Fallback reranking when LLM fails
     * Uses original scores with small adjustments
     */
    private fallbackRerank(results: LecturerSearchResult[], topK: number): RerankedResult[] {
        console.log('⚠️ [RERANKER] Using fallback reranking (no LLM)')

        return results.slice(0, topK).map((result, idx) => ({
            ...result,
            rerankScore: result.finalScore,
            rerankReason: this.generateFallbackReason(result),
            originalRank: idx + 1,
            finalRank: idx + 1
        }))
    }

    /**
     * Generate simple reason when LLM is not available
     */
    private generateFallbackReason(result: LecturerSearchResult): string {
        const reasons: string[] = []

        if (result.matchType === 'exact-name') {
            reasons.push('Trùng khớp chính xác về tên')
        } else if (result.matchType === 'fuzzy-name') {
            reasons.push('Tên tương đồng với yêu cầu')
        }

        if (result.semanticScore > 0.8) {
            reasons.push('chuyên môn rất phù hợp')
        } else if (result.semanticScore > 0.6) {
            reasons.push('chuyên môn khá phù hợp')
        }

        if (result.title?.includes('GS') || result.title?.includes('PGS')) {
            reasons.push('có học hàm cao')
        }

        if (result.publications && result.publications.length > 5) {
            reasons.push('có nhiều công trình nghiên cứu')
        }

        return reasons.length > 0
            ? reasons.join(', ') + '.'
            : `Semantic similarity score: ${result.semanticScore.toFixed(2)}`
    }

    /**
     * Rerank with custom weights (for fine-tuning)
     */
    async rerankWithWeights(
        query: string,
        results: LecturerSearchResult[],
        weights: {
            llmScore: number // Default 0.6
            originalScore: number // Default 0.4
        },
        topK: number = 10
    ): Promise<RerankedResult[]> {
        const reranked = await this.rerank(query, results, topK * 2)

        // Combine LLM score with original score
        reranked.forEach((r) => {
            r.rerankScore = r.rerankScore * weights.llmScore + r.finalScore * weights.originalScore
        })

        // Re-sort and re-rank
        reranked.sort((a, b) => b.rerankScore - a.rerankScore)
        reranked.forEach((r, idx) => {
            r.finalRank = idx + 1
        })

        return reranked.slice(0, topK)
    }

    /**
     * Batch rerank (for multiple queries)
     */
    async batchRerank(
        queries: Array<{ query: string; results: LecturerSearchResult[] }>,
        topK: number = 10
    ): Promise<Map<string, RerankedResult[]>> {
        const resultsMap = new Map<string, RerankedResult[]>()

        for (const { query, results } of queries) {
            const reranked = await this.rerank(query, results, topK)
            resultsMap.set(query, reranked)
        }

        return resultsMap
    }
}
