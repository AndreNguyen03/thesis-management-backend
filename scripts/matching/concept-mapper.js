/**
 * Concept Mapper - Pipeline 1, Step 2-3
 * Map normalized tokens → concepts (NO LLM)
 */

const { normalizeAndTokenize, normalizeArray } = require('./text-normalizer')
const { findConcepts } = require('./concept-indexer')

/**
 * Extract concepts từ một text field
 */
function extractConceptsFromText(text, conceptIndex, options = {}) {
    const { source = 'unknown', minDepth = 3 } = options

    const tokens = normalizeAndTokenize(text)
    const matched = []
    const unmatchedTokens = []

    for (const token of tokens) {
        const concepts = findConcepts(token, conceptIndex)

        if (concepts.length > 0) {
            concepts.forEach((concept) => {
                matched.push({
                    key: concept.key,
                    label: concept.label,
                    depth: concept.depth,
                    role: concept.role,
                    parent: concept.parent,
                    source,
                    matchedToken: token,
                    matchedText: text
                })
            })
        } else {
            unmatchedTokens.push(token)
        }
    }

    // Filter by depth
    const filtered = matched.filter((c) => c.depth >= minDepth)

    return {
        concepts: filtered,
        unmatchedTokens
    }
}

/**
 * Extract concepts từ array of texts
 */
function extractConceptsFromArray(textArray, conceptIndex, options = {}) {
    const { source = 'unknown', minDepth = 3 } = options

    const allConcepts = []
    const allUnmatched = new Set()

    if (!Array.isArray(textArray)) return { concepts: [], unmatchedTokens: [] }

    for (const text of textArray) {
        if (!text || typeof text !== 'string') continue

        const result = extractConceptsFromText(text, conceptIndex, { source, minDepth })
        allConcepts.push(...result.concepts)
        result.unmatchedTokens.forEach((t) => allUnmatched.add(t))
    }

    // Deduplicate concepts by key
    const uniqueConcepts = deduplicateConcepts(allConcepts)

    return {
        concepts: uniqueConcepts,
        unmatchedTokens: Array.from(allUnmatched)
    }
}

/**
 * Extract concepts từ lecturer profile
 */
function extractLecturerConcepts(lecturer, conceptIndex) {
    const MIN_DEPTH = 3

    const results = {
        concepts: [],
        unmatchedTokens: [],
        stats: {
            fromAreaInterest: 0,
            fromResearchInterests: 0,
            fromPublications: 0,
            totalUnmatched: 0
        }
    }

    // Extract from areaInterest
    if (lecturer.areaInterest && lecturer.areaInterest.length > 0) {
        const result = extractConceptsFromArray(lecturer.areaInterest, conceptIndex, {
            source: 'areaInterest',
            minDepth: MIN_DEPTH
        })
        results.concepts.push(...result.concepts)
        results.unmatchedTokens.push(...result.unmatchedTokens)
        results.stats.fromAreaInterest = result.concepts.length
    }

    // Extract from researchInterests
    if (lecturer.researchInterests && lecturer.researchInterests.length > 0) {
        const result = extractConceptsFromArray(lecturer.researchInterests, conceptIndex, {
            source: 'researchInterests',
            minDepth: MIN_DEPTH
        })
        results.concepts.push(...result.concepts)
        results.unmatchedTokens.push(...result.unmatchedTokens)
        results.stats.fromResearchInterests = result.concepts.length
    }

    // Extract from publication titles
    if (lecturer.publications && lecturer.publications.length > 0) {
        const titles = lecturer.publications.map((p) => p.title).filter(Boolean)

        if (titles.length > 0) {
            const result = extractConceptsFromArray(titles, conceptIndex, {
                source: 'publications',
                minDepth: MIN_DEPTH
            })
            results.concepts.push(...result.concepts)
            results.unmatchedTokens.push(...result.unmatchedTokens)
            results.stats.fromPublications = result.concepts.length
        }
    }

    // Deduplicate
    results.concepts = deduplicateConcepts(results.concepts)
    results.unmatchedTokens = Array.from(new Set(results.unmatchedTokens))
    results.stats.totalUnmatched = results.unmatchedTokens.length

    return results
}

/**
 * Extract concepts từ student profile
 */
function extractStudentConcepts(student, conceptIndex) {
    const MIN_DEPTH = 3

    const results = {
        concepts: [],
        unmatchedTokens: [],
        stats: {
            fromSkills: 0,
            fromInterests: 0,
            totalUnmatched: 0
        }
    }

    // Extract from skills
    if (student.skills && student.skills.length > 0) {
        const result = extractConceptsFromArray(student.skills, conceptIndex, { source: 'skills', minDepth: MIN_DEPTH })
        results.concepts.push(...result.concepts)
        results.unmatchedTokens.push(...result.unmatchedTokens)
        results.stats.fromSkills = result.concepts.length
    }

    // Extract from interests
    if (student.interests && student.interests.length > 0) {
        const result = extractConceptsFromArray(student.interests, conceptIndex, {
            source: 'interests',
            minDepth: MIN_DEPTH
        })
        results.concepts.push(...result.concepts)
        results.unmatchedTokens.push(...result.unmatchedTokens)
        results.stats.fromInterests = result.concepts.length
    }

    // Deduplicate
    results.concepts = deduplicateConcepts(results.concepts)
    results.unmatchedTokens = Array.from(new Set(results.unmatchedTokens))
    results.stats.totalUnmatched = results.unmatchedTokens.length

    return results
}

/**
 * Deduplicate concepts, keeping source info
 */
function deduplicateConcepts(concepts) {
    const map = new Map()

    for (const concept of concepts) {
        const existing = map.get(concept.key)

        if (!existing) {
            map.set(concept.key, { ...concept, sources: [concept.source] })
        } else {
            // Merge sources
            if (!existing.sources.includes(concept.source)) {
                existing.sources.push(concept.source)
            }
        }
    }

    return Array.from(map.values())
}

module.exports = {
    extractConceptsFromText,
    extractConceptsFromArray,
    extractLecturerConcepts,
    extractStudentConcepts,
    deduplicateConcepts
}
