/**
 * Concept Evolution Utilities - Pipeline 3
 * Detect and manage new concept candidates from unmapped tokens
 */

import { ConceptIndex } from './concept-indexer'

export interface ConceptCandidate {
    canonical: string
    variants: string[]
    frequency: number
    examples: Array<{
        token: string
        profileId: string
        profileType: string
        source: string
    }>
}

export interface ConceptSuggestion {
    parent: string
    label: string
    aliases: string[]
}

/**
 * Detect unmapped tokens that might be new concepts
 */
export function detectNewConcepts(
    unmatchedTokens: string[],
    options: {
        minTokenLength?: number
        excludeCommonWords?: boolean
    } = {}
): Array<{ tokens: string[]; frequency: number; canonical: string }> {
    const { minTokenLength = 3, excludeCommonWords = true } = options

    const commonWords = new Set([
        'va',
        'cua',
        'cho',
        'trong',
        'voi',
        'tren',
        'duoi',
        'and',
        'or',
        'the',
        'for',
        'with',
        'from',
        'to',
        'application',
        'system',
        'development',
        'research',
        'project',
        'using',
        'based'
    ])

    const candidates = unmatchedTokens.filter((token) => {
        if (token.length < minTokenLength) return false
        if (excludeCommonWords && commonWords.has(token)) return false
        return true
    })

    const grouped = groupSimilarTokens(candidates)

    return grouped.map((group) => ({
        tokens: group,
        frequency: group.length,
        canonical: group[0]
    }))
}

/**
 * Group similar tokens using simple similarity
 */
function groupSimilarTokens(tokens: string[]): string[][] {
    const groups: string[][] = []
    const processed = new Set<string>()

    for (const token of tokens) {
        if (processed.has(token)) continue

        const similar = [token]
        processed.add(token)

        for (const other of tokens) {
            if (processed.has(other)) continue

            if (isSimilar(token, other)) {
                similar.push(other)
                processed.add(other)
            }
        }

        groups.push(similar)
    }

    return groups
}

/**
 * Check if two tokens are similar
 */
function isSimilar(token1: string, token2: string): boolean {
    // One contains the other
    if (token1.includes(token2) || token2.includes(token1)) {
        return true
    }

    // Edit distance check
    if (Math.abs(token1.length - token2.length) <= 2) {
        const distance = levenshteinDistance(token1, token2)
        return distance <= 2
    }

    return false
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                )
            }
        }
    }

    return matrix[str2.length][str1.length]
}

/**
 * Suggest parent concept by keyword matching (fallback without LLM)
 */
export function suggestParentByKeyword(candidateToken: string, conceptIndex: ConceptIndex): ConceptSuggestion {
    const keywords: Record<string, string[]> = {
        'it.ai': ['ai', 'machine', 'learning', 'neural', 'deep', 'intelligence', 'nlp', 'vision', 'model'],
        'it.data': ['data', 'analytics', 'mining', 'warehouse', 'big data', 'etl', 'pipeline'],
        'it.software': ['software', 'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'api'],
        'it.system': ['system', 'cloud', 'distributed', 'infrastructure', 'devops', 'container', 'kubernetes'],
        'it.security': ['security', 'crypto', 'encryption', 'authentication', 'authorization', 'firewall'],
        'it.network': ['network', 'protocol', 'wireless', 'communication', 'tcp', 'http', 'socket'],
        'it.database': ['database', 'sql', 'nosql', 'mongodb', 'mysql', 'postgres', 'query'],
        'it.iot': ['iot', 'sensor', 'embedded', 'arduino', 'raspberry', 'mqtt']
    }

    const tokenLower = candidateToken.toLowerCase()

    for (const [parent, words] of Object.entries(keywords)) {
        if (words.some((w) => tokenLower.includes(w))) {
            return {
                parent,
                label: candidateToken
                    .split(/[\s_-]+/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                aliases: []
            }
        }
    }

    // Default to root IT if no match
    return {
        parent: 'it',
        label: candidateToken
            .split(/[\s_-]+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        aliases: []
    }
}

/**
 * Build concept candidate queue from multiple profile extractions
 */
export function buildConceptCandidateQueue(
    unmatchedTokensByProfile: Array<{
        profileId: string
        profileType: string
        source: string
        unmatchedTokens: string[]
    }>,
    conceptIndex: ConceptIndex
): ConceptCandidate[] {
    const allUnmatched: Array<{
        token: string
        profileId: string
        profileType: string
        source: string
    }> = []

    // Aggregate all unmatched tokens
    for (const profile of unmatchedTokensByProfile) {
        profile.unmatchedTokens.forEach((token) => {
            allUnmatched.push({
                token,
                profileId: profile.profileId,
                profileType: profile.profileType,
                source: profile.source
            })
        })
    }

    // Count frequency
    const frequencyMap = new Map<string, number>()
    allUnmatched.forEach((item) => {
        const count = frequencyMap.get(item.token) || 0
        frequencyMap.set(item.token, count + 1)
    })

    // Detect candidates
    const uniqueTokens = Array.from(new Set(allUnmatched.map((i) => i.token)))
    const candidates = detectNewConcepts(uniqueTokens)

    // Enrich with frequency and examples
    return candidates
        .map((candidate) => ({
            canonical: candidate.canonical,
            variants: candidate.tokens,
            frequency: frequencyMap.get(candidate.canonical) || 1,
            examples: allUnmatched.filter((i) => candidate.tokens.includes(i.token)).slice(0, 5)
        }))
        .sort((a, b) => b.frequency - a.frequency)
}

/**
 * Generate concept key from label and parent
 */
export function generateConceptKey(label: string, parent: string): string {
    const normalized = label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')

    return `${parent}.${normalized}`
}
