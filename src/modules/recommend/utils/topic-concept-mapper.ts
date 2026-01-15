/**
 * Topic Concept Mapper
 * Extract concepts from topic data (fields, requirements, description)
 */

import {
    extractConceptsFromText,
    extractConceptsFromArray,
    ExtractionResult,
    ExtractedConcept
} from '../../matching/utils/concept-mapper'
import { ConceptIndex } from '../../matching/utils/concept-indexer'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'

export interface TopicConceptExtractionResult {
    topicId: string
    titleVN: string
    concepts: ExtractedConcept[]
    unmatchedTokens: string[]
    stats: {
        fromFields: number
        fromRequirements: number
        fromDescription: number
        total: number
    }
}

/**
 * Extract concepts từ topic data
 */
export function extractTopicConcepts(
    topic: CandidateTopicDto,
    conceptIndex: ConceptIndex,
    options: { minDepth?: number } = {}
): TopicConceptExtractionResult {
    const { minDepth = 3 } = options

    const allConcepts: ExtractedConcept[] = []
    const allUnmatched = new Set<string>()

    // 1. Extract từ fields (lĩnh vực)
    let fromFields = 0
    if (topic.fields && topic.fields.length > 0) {
        const fieldNames = topic.fields.map((f) => f.name)
        const fieldResult = extractConceptsFromArray(fieldNames, conceptIndex, {
            source: 'field',
            minDepth
        })
        allConcepts.push(...fieldResult.concepts)
        fromFields = fieldResult.concepts.length
        fieldResult.unmatchedTokens.forEach((t) => allUnmatched.add(t))
    }

    // 2. Extract từ requirements (yêu cầu)
    let fromRequirements = 0
    if (topic.requirements && topic.requirements.length > 0) {
        const requirementNames = topic.requirements.map((r) => r.name)
        const reqResult = extractConceptsFromArray(requirementNames, conceptIndex, {
            source: 'requirement',
            minDepth
        })
        allConcepts.push(...reqResult.concepts)
        fromRequirements = reqResult.concepts.length
        reqResult.unmatchedTokens.forEach((t) => allUnmatched.add(t))
    }

    // 3. Extract từ description
    let fromDescription = 0
    if (topic.description && topic.description.length > 20) {
        const descResult = extractConceptsFromText(topic.description, conceptIndex, {
            source: 'description',
            minDepth
        })
        allConcepts.push(...descResult.concepts)
        fromDescription = descResult.concepts.length
        descResult.unmatchedTokens.forEach((t) => allUnmatched.add(t))
    }

    // 4. Deduplicate concepts by key, merge sources
    const conceptMap = new Map<string, ExtractedConcept>()
    for (const concept of allConcepts) {
        const existing = conceptMap.get(concept.key)
        if (existing) {
            // Merge sources
            const sources = existing.sources || [existing.source]
            if (!sources.includes(concept.source)) {
                sources.push(concept.source)
            }
            existing.sources = sources
        } else {
            conceptMap.set(concept.key, { ...concept, sources: [concept.source] })
        }
    }

    const uniqueConcepts = Array.from(conceptMap.values())

    return {
        topicId: topic._id,
        titleVN: topic.titleVN,
        concepts: uniqueConcepts,
        unmatchedTokens: Array.from(allUnmatched),
        stats: {
            fromFields,
            fromRequirements,
            fromDescription,
            total: uniqueConcepts.length
        }
    }
}

/**
 * Batch extract concepts từ nhiều topics
 */
export function batchExtractTopicConcepts(
    topics: CandidateTopicDto[],
    conceptIndex: ConceptIndex,
    options: { minDepth?: number } = {}
): TopicConceptExtractionResult[] {
    return topics.map((topic) => extractTopicConcepts(topic, conceptIndex, options))
}
