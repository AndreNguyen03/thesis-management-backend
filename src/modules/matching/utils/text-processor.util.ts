/**
 * Text processing utilities for concept matching
 */

/**
 * English and Vietnamese stopwords to be removed during text processing
 */
const STOPWORDS = new Set([
    // English stopwords
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
    'or',
    'but',
    'not',
    'can',
    'this',
    'they',
    'have',
    'had',
    'what',
    'when',
    'where',
    'who',
    'which',
    'their',
    'if',
    'do',
    'does',
    'did',
    'would',
    'could',
    'should',

    // Vietnamese stopwords
    'va',
    'cua',
    'la',
    'co',
    'trong',
    'mot',
    'cac',
    'cho',
    'den',
    'voi',
    'tu',
    'tren',
    'duoi',
    'nay',
    'do',
    'ma',
    'khi',
    'nhu',
    'se',
    'da',
    'roi',
    'ra',
    'vao',
    'hay',
    'nhung',
    'con',
    'thi',
    'bi',
    'duoc',
    'ho',
    'o',
    'noi',
    'sau',
    'truoc',
    'giua',
    'va',
    'cua',
    'la',
    'co',
    'trong',
    'mot',
    'cac',
    'cho',
    'den',
    'voi',
    'tu',
    'tren',
    'duoi',
    'nay',
    'do',
    'ma',
    'khi',
    'nhu',
    'se',
    'da',
    'roi',
    'ra',
    'vao',
    'hay',
    'nhung',
    'con',
    'thi',
    'bi',
    'duoc',
    'ho',
    'o',
    'noi',
    'sau',
    'truoc',
    'giua',
    'các',
    'của',
    'là',
    'có',
    'được',
    'một',
    'và',
    'thì',
    'như',
    'để',
    'tại',
    'này',
    'đó',
    'nên',
    'sẽ',
    'đã',
    'hoặc',
    'nhưng',
    'khi',
    'đến',
    'với',
    'từ'
])

/**
 * Remove Vietnamese diacritics (accents)
 * Converts: "Trí tuệ nhân tạo" → "tri tue nhan tao"
 */
export function removeDiacritics(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
}

/**
 * Normalize text for matching
 * - Convert to lowercase
 * - Remove parentheses content (e.g., "(AI)" or "(Điện toán đám mây)")
 * - Remove Vietnamese diacritics (accents)
 * - Remove special characters
 * - Trim whitespace
 * - Remove extra spaces
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/\([^)]*\)/g, '') // Remove text in parentheses
        .replace(/[–—]/g, '-') // Normalize dashes
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w\s-]/g, ' ') // Remove special characters, keep alphanumeric and spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
}

/**
 * Remove stopwords from text
 */
export function removeStopwords(text: string): string {
    const tokens = text.split(' ')
    const filtered = tokens.filter((token) => !STOPWORDS.has(token) && token.length > 1)
    return filtered.join(' ')
}

/**
 * Full text preprocessing pipeline:
 * 1. Normalize text
 * 2. Remove stopwords
 */
export function preprocessText(text: string): string {
    const normalized = normalizeText(text)
    return removeStopwords(normalized)
}

/**
 * Extract tokens from text
 */
export function tokenize(text: string): string[] {
    const normalized = normalizeText(text)
    return normalized.split(' ').filter((token) => token.length > 0)
}

/**
 * Generate n-grams from tokens
 * Useful for matching multi-word concepts
 */
export function generateNGrams(tokens: string[], maxN: number = 3): string[] {
    const ngrams: string[] = []

    for (let n = 1; n <= Math.min(maxN, tokens.length); n++) {
        for (let i = 0; i <= tokens.length - n; i++) {
            ngrams.push(tokens.slice(i, i + n).join(' '))
        }
    }

    return ngrams
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length')
    }

    if (vecA.length === 0) {
        return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
        return 0
    }

    return dotProduct / (normA * normB)
}

/**
 * Group similar skills together
 * This is a simple implementation - can be enhanced with clustering
 */
export function groupSkills(skills: string[]): string[][] {
    // For now, return each skill as its own group
    // TODO: Implement proper skill clustering/grouping
    return skills.map((skill) => [skill])
}
