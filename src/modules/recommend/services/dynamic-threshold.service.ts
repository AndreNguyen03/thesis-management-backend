import { Injectable } from '@nestjs/common'

// services/dynamic-threshold.service.ts
@Injectable()
export class DynamicThresholdService {
    selectRerankCandidates<T extends { score: number }>(
        items: T[],
        minCandidates: number = 5,
        maxCandidates: number = 30
    ): T[] {
        if (items.length <= minCandidates) {
            return items
        }

        // Sort by score
        const sorted = [...items].sort((a, b) => b.score - a.score)
        const scores = sorted.map((item) => item.score)

        // Tính mean và standard deviation
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
        const std = Math.sqrt(variance)

        // Dynamic threshold: mean + 0.5*std
        let threshold = Math.max(mean + 0.5 * std, 0.3)

        // Lấy topics có score >= threshold
        let candidates = sorted.filter((item) => item.score >= threshold)

        // Đảm bảo số lượng
        if (candidates.length < minCandidates) {
            candidates = sorted.slice(0, minCandidates)
        } else if (candidates.length > maxCandidates) {
            candidates = candidates.slice(0, maxCandidates)
        }

        return candidates
    }
}
