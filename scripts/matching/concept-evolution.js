/**
 * Concept Evolution Handler - Pipeline 3
 * Handle new concepts that don't map to existing ontology
 */

const { normalize } = require('./text-normalizer')

/**
 * Detect unmapped tokens that might be new concepts
 */
function detectNewConcepts(unmatchedTokens, options = {}) {
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
        'research'
    ])

    const candidates = unmatchedTokens.filter((token) => {
        // Filter short tokens
        if (token.length < minTokenLength) return false

        // Filter common words
        if (excludeCommonWords && commonWords.has(token)) return false

        return true
    })

    // Group similar candidates
    const grouped = groupSimilarTokens(candidates)

    return grouped.map((group) => ({
        tokens: group,
        frequency: group.length,
        canonical: group[0] // Use first as representative
    }))
}

/**
 * Group similar tokens (simple similarity)
 */
function groupSimilarTokens(tokens) {
    const groups = []
    const processed = new Set()

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
 * Simple similarity check
 */
function isSimilar(token1, token2) {
    // Check if one contains the other
    if (token1.includes(token2) || token2.includes(token1)) {
        return true
    }

    // Check edit distance (very simple)
    if (Math.abs(token1.length - token2.length) <= 2) {
        const distance = levenshteinDistance(token1, token2)
        return distance <= 2
    }

    return false
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = []

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
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
            }
        }
    }

    return matrix[str2.length][str1.length]
}

/**
 * Suggest parent concept using LLM (placeholder)
 */
async function suggestConceptParent(candidateToken, conceptIndex, llmClient) {
    if (!llmClient) {
        // Fallback: suggest based on keyword matching
        return suggestParentByKeyword(candidateToken, conceptIndex)
    }

    // Get all domain-level concepts (depth 2)
    const domains = []
    for (const [key, concept] of conceptIndex.byKey.entries()) {
        if (concept.depth === 2) {
            domains.push({
                key: concept.key,
                label: concept.label
            })
        }
    }

    const domainList = domains.map((d) => `${d.key}: ${d.label}`).join('\n')

    const prompt = `
Bạn là chuyên gia phân loại khái niệm IT. 

Khái niệm mới: "${candidateToken}"

Các domain hiện có trong ontology:
${domainList}

Hãy gợi ý:
1. Domain phù hợp nhất (parent key)
2. Label chuẩn cho khái niệm này
3. Các alias (nếu có)

Trả về JSON format:
{
  "parent": "it.xxx",
  "label": "...",
  "aliases": [...]
}
`.trim()

    try {
        const response = await llmClient.generate(prompt, { format: 'json' })
        return JSON.parse(response.text)
    } catch (error) {
        console.error('LLM suggestion failed:', error.message)
        return suggestParentByKeyword(candidateToken, conceptIndex)
    }
}

/**
 * Fallback: suggest parent by keyword matching
 */
function suggestParentByKeyword(candidateToken, conceptIndex) {
    const keywords = {
        'it.ai': ['ai', 'machine', 'learning', 'neural', 'deep', 'intelligence'],
        'it.data': ['data', 'analytics', 'mining', 'warehouse', 'big data'],
        'it.software': ['software', 'web', 'mobile', 'app', 'frontend', 'backend'],
        'it.system': ['system', 'cloud', 'distributed', 'infrastructure'],
        'it.security': ['security', 'crypto', 'encryption', 'authentication'],
        'it.network': ['network', 'protocol', 'wireless', 'communication']
    }

    for (const [parent, words] of Object.entries(keywords)) {
        if (words.some((w) => candidateToken.includes(w))) {
            return {
                parent,
                label: candidateToken
                    .split(/\s+/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                aliases: []
            }
        }
    }

    return {
        parent: 'it',
        label: candidateToken,
        aliases: []
    }
}

/**
 * Build concept candidate queue
 */
function buildConceptCandidateQueue(unmatchedTokensByProfile, conceptIndex) {
    const allUnmatched = []

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
    const frequencyMap = new Map()
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

module.exports = {
    detectNewConcepts,
    suggestConceptParent,
    buildConceptCandidateQueue
}
