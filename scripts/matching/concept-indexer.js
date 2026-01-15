/**
 * Concept Indexer - Pipeline 1, Step 2
 * Build index từ concept tree để lookup nhanh
 */

const { normalize } = require('./text-normalizer')

/**
 * Tính depth của concept key
 * it.ai.machine-learning → depth = 3
 */
function getDepth(key) {
    return key.split('.').length
}

/**
 * Lấy parent key
 * it.ai.machine-learning → it.ai
 */
function getParent(key) {
    const parts = key.split('.')
    if (parts.length <= 1) return null
    return parts.slice(0, -1).join('.')
}

/**
 * Xác định role của concept
 */
function getRole(key, allKeys) {
    const depth = getDepth(key)

    if (depth === 1) return 'root'
    if (depth === 2) return 'domain'

    // Check if it has children
    const hasChildren = allKeys.some((k) => k.startsWith(key + '.'))
    return hasChildren ? 'branch' : 'leaf'
}

/**
 * Build index từ concept array
 */
function buildConceptIndex(concepts) {
    const index = {
        byKey: new Map(),
        byLabel: new Map(),
        byAlias: new Map(),
        allKeys: []
    }

    // First pass: collect all keys
    concepts.forEach((concept) => {
        index.allKeys.push(concept.key)
    })

    // Second pass: build full index
    concepts.forEach((concept) => {
        const depth = getDepth(concept.key)
        const role = getRole(concept.key, index.allKeys)
        const parent = getParent(concept.key)

        const enriched = {
            ...concept,
            depth,
            role,
            parent
        }

        // Index by key
        index.byKey.set(concept.key, enriched)

        // Index by normalized label
        const normalizedLabel = normalize(concept.label)
        if (normalizedLabel) {
            if (!index.byLabel.has(normalizedLabel)) {
                index.byLabel.set(normalizedLabel, [])
            }
            index.byLabel.get(normalizedLabel).push(enriched)
        }

        // Index by normalized aliases
        if (concept.aliases && Array.isArray(concept.aliases)) {
            concept.aliases.forEach((alias) => {
                const normalizedAlias = normalize(alias)
                if (normalizedAlias) {
                    if (!index.byAlias.has(normalizedAlias)) {
                        index.byAlias.set(normalizedAlias, [])
                    }
                    index.byAlias.get(normalizedAlias).push(enriched)
                }
            })
        }
    })

    return index
}

/**
 * Tìm concept từ normalized token
 */
function findConcepts(token, conceptIndex) {
    const matches = []

    // Priority 1: exact label match
    if (conceptIndex.byLabel.has(token)) {
        matches.push(...conceptIndex.byLabel.get(token))
    }

    // Priority 2: alias match
    if (conceptIndex.byAlias.has(token)) {
        matches.push(...conceptIndex.byAlias.get(token))
    }

    // Priority 3: partial match on label (contains)
    if (matches.length === 0) {
        for (const [label, concepts] of conceptIndex.byLabel.entries()) {
            if (label.includes(token) || token.includes(label)) {
                matches.push(...concepts)
            }
        }
    }

    // Deduplicate by key
    const seen = new Set()
    return matches.filter((c) => {
        if (seen.has(c.key)) return false
        seen.add(c.key)
        return true
    })
}

/**
 * Lấy tất cả ancestors của một concept
 */
function getAncestors(conceptKey, conceptIndex) {
    const ancestors = []
    let current = conceptKey

    while (current) {
        const concept = conceptIndex.byKey.get(current)
        if (!concept) break

        ancestors.push(concept)
        current = concept.parent
    }

    return ancestors
}

/**
 * Lấy tất cả descendants của một concept
 */
function getDescendants(conceptKey, conceptIndex) {
    const descendants = []
    const prefix = conceptKey + '.'

    for (const key of conceptIndex.allKeys) {
        if (key.startsWith(prefix)) {
            const concept = conceptIndex.byKey.get(key)
            if (concept) descendants.push(concept)
        }
    }

    return descendants
}

/**
 * Check nếu 2 concepts có chung parent ở depth cụ thể
 */
function haveCommonParentAtDepth(key1, key2, depth) {
    const parts1 = key1.split('.')
    const parts2 = key2.split('.')

    if (parts1.length <= depth || parts2.length <= depth) return false

    const parent1 = parts1.slice(0, depth).join('.')
    const parent2 = parts2.slice(0, depth).join('.')

    return parent1 === parent2
}

module.exports = {
    buildConceptIndex,
    findConcepts,
    getDepth,
    getParent,
    getRole,
    getAncestors,
    getDescendants,
    haveCommonParentAtDepth
}
