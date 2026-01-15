/**
 * Matching Engine - Pipeline 2
 * Match sinh viên ↔ giảng viên dựa trên leaf-level concepts
 */

const { haveCommonParentAtDepth } = require('./concept-indexer')

// Constants
const MATCH_DEPTH = 3
const MIN_SCORE_THRESHOLD = 1.0

// Depth weights
const DEPTH_WEIGHTS = {
    3: 1.0,
    4: 1.5,
    5: 2.0,
    6: 2.5
}

// Parent boost config
const PARENT_BOOST = 0.3
const PARENT_DEPTH_FOR_BOOST = 2

/**
 * Get weight for a concept based on depth
 */
function getConceptWeight(depth) {
    return DEPTH_WEIGHTS[depth] || DEPTH_WEIGHTS[6]
}

/**
 * Match một student với một lecturer
 */
function matchStudentLecturer(studentConcepts, lecturerConcepts, options = {}) {
    const { minDepth = MATCH_DEPTH, minScore = MIN_SCORE_THRESHOLD, enableParentBoost = true } = options

    // Filter valid concepts (depth >= minDepth)
    const validStudentConcepts = studentConcepts.filter((c) => c.depth >= minDepth)
    const validLecturerConcepts = lecturerConcepts.filter((c) => c.depth >= minDepth)

    if (validStudentConcepts.length === 0 || validLecturerConcepts.length === 0) {
        return null
    }

    // Build lookup map for lecturer concepts
    const lecturerConceptMap = new Map()
    validLecturerConcepts.forEach((c) => {
        lecturerConceptMap.set(c.key, c)
    })

    const matchedConcepts = []
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
        const parentBoosts = []

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
        const uniqueBoosts = new Map()
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
 * Match một student với nhiều lecturers
 */
function matchStudentWithLecturers(studentConcepts, lecturersData, conceptIndex, options = {}) {
    const matches = []

    for (const lecturer of lecturersData) {
        if (!lecturer.concepts || lecturer.concepts.length === 0) continue

        const matchResult = matchStudentLecturer(studentConcepts, lecturer.concepts, options)

        if (matchResult) {
            matches.push({
                lecturerId: lecturer._id,
                lecturerName: lecturer.userId?.name || 'Unknown',
                lecturerTitle: lecturer.title,
                faculty: lecturer.facultyId,
                ...matchResult
            })
        }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    return matches
}

/**
 * Rank và filter matches
 */
function rankMatches(matches, options = {}) {
    const { topN = 10, minScore = MIN_SCORE_THRESHOLD, minConceptCount = 1 } = options

    return matches.filter((m) => m.score >= minScore && m.conceptCount >= minConceptCount).slice(0, topN)
}

/**
 * Tính statistics cho match results
 */
function calculateMatchStats(matches) {
    if (matches.length === 0) {
        return {
            totalMatches: 0,
            avgScore: 0,
            maxScore: 0,
            minScore: 0,
            avgConceptCount: 0
        }
    }

    const scores = matches.map((m) => m.score)
    const conceptCounts = matches.map((m) => m.conceptCount)

    return {
        totalMatches: matches.length,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        maxScore: Math.max(...scores),
        minScore: Math.min(...scores),
        avgConceptCount: conceptCounts.reduce((a, b) => a + b, 0) / conceptCounts.length
    }
}

module.exports = {
    matchStudentLecturer,
    matchStudentWithLecturers,
    rankMatches,
    calculateMatchStats,
    MATCH_DEPTH,
    MIN_SCORE_THRESHOLD,
    DEPTH_WEIGHTS
}
