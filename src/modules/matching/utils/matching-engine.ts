/**
 * Matching Engine - Pipeline 2
 * Match sinh viên ↔ giảng viên dựa trên leaf-level concepts
 */

import { haveCommonParentAtDepth } from './concept-indexer'
import { ExtractedConcept } from './concept-mapper'

// Constants
export const MATCH_DEPTH = 3
export const MIN_SCORE_THRESHOLD = 1.0

// Depth weights
export const DEPTH_WEIGHTS: Record<number, number> = {
    3: 1.0,
    4: 1.5,
    5: 2.0,
    6: 2.5
}

// Parent boost config
export const PARENT_BOOST = 0.3
export const PARENT_DEPTH_FOR_BOOST = 2

export interface MatchedConcept {
    key: string
    label: string
    depth: number
    weight: number
    matchType: 'exact' | 'parent-boost'
    studentSources: string[]
    lecturerSources: string[]
}

export interface MatchResult {
    score: number
    coreScore: number
    boostScore: number
    matchedConcepts: MatchedConcept[]
    conceptCount: number
}

/**
 * Get weight for a concept based on depth
 */
export function getConceptWeight(depth: number): number {
    return DEPTH_WEIGHTS[depth] || DEPTH_WEIGHTS[6]
}

/**
 * Match một student với một lecturer
 */
export function matchStudentLecturer(
    studentConcepts: ExtractedConcept[],
    lecturerConcepts: ExtractedConcept[],
    options: {
        minDepth?: number
        minScore?: number
        enableParentBoost?: boolean
    } = {}
): MatchResult | null {
    const { minDepth = MATCH_DEPTH, minScore = MIN_SCORE_THRESHOLD, enableParentBoost = true } = options

    // Filter valid concepts (depth >= minDepth)
    const validStudentConcepts = studentConcepts.filter((c) => c.depth >= minDepth)
    const validLecturerConcepts = lecturerConcepts.filter((c) => c.depth >= minDepth)

    if (validStudentConcepts.length === 0 || validLecturerConcepts.length === 0) {
        return null
    }

    // Build lookup map for lecturer concepts
    const lecturerConceptMap = new Map<string, ExtractedConcept>()
    validLecturerConcepts.forEach((c) => {
        lecturerConceptMap.set(c.key, c)
    })

    const matchedConcepts: MatchedConcept[] = []
    let coreScore = 0

    // CORE MATCHING: Exact key match (leaf-level only)
    for (const studentConcept of validStudentConcepts) {
        const lecturerConcept = lecturerConceptMap.get(studentConcept.key)

        if (lecturerConcept) {
            const weight = getConceptWeight(studentConcept.depth)
            coreScore += weight

            matchedConcepts.push({
                key: studentConcept.key,
                label: studentConcept.label,
                depth: studentConcept.depth,
                weight,
                matchType: 'exact',
                studentSources: studentConcept.sources || [studentConcept.source],
                lecturerSources: lecturerConcept.sources || [lecturerConcept.source]
            })
        }
    }

    let totalScore = coreScore
    let boostScore = 0

    // PARENT BOOST: Apply only if có ít nhất 1 core match
    if (enableParentBoost && coreScore > 0) {
        const parentBoosts: Array<{
            studentKey: string
            lecturerKey: string
            commonParent: string
            boost: number
        }> = []

        for (const studentConcept of validStudentConcepts) {
            for (const lecturerConcept of validLecturerConcepts) {
                // Skip if already matched exactly
                if (studentConcept.key === lecturerConcept.key) continue

                // Check if they share parent at depth 2 (domain level)
                if (haveCommonParentAtDepth(studentConcept.key, lecturerConcept.key, PARENT_DEPTH_FOR_BOOST)) {
                    const boost = PARENT_BOOST
                    boostScore += boost

                    parentBoosts.push({
                        studentKey: studentConcept.key,
                        lecturerKey: lecturerConcept.key,
                        commonParent: studentConcept.key.split('.').slice(0, PARENT_DEPTH_FOR_BOOST).join('.'),
                        boost
                    })
                }
            }
        }

        // Deduplicate parent boosts
        const uniqueBoosts = new Map<string, (typeof parentBoosts)[0]>()
        parentBoosts.forEach((b) => {
            const key = `${b.studentKey}-${b.lecturerKey}`
            if (!uniqueBoosts.has(key)) {
                uniqueBoosts.set(key, b)
            }
        })

        totalScore += boostScore
    }

    // Reject if below threshold
    if (totalScore < minScore) {
        return null
    }

    return {
        score: totalScore,
        coreScore,
        boostScore,
        matchedConcepts,
        conceptCount: matchedConcepts.length
    }
}

/**
 * Rank matches
 */
export function rankMatches<T extends { score: number; conceptCount: number }>(
    matches: T[],
    options: {
        topN?: number
        minScore?: number
        minConceptCount?: number
    } = {}
): T[] {
    const { topN = 10, minScore = MIN_SCORE_THRESHOLD, minConceptCount = 1 } = options

    return matches
        .filter((m) => m.score >= minScore && m.conceptCount >= minConceptCount)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
}
