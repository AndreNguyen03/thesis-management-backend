/**
 * Text processing utilities for Vietnamese and English text normalization
 */

// Vietnamese stopwords
const VIETNAMESE_STOPWORDS = new Set([
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
    'cho',
    'với',
    'trong',
    'từ',
    'bởi',
    'về',
    'theo',
    'sau',
    'trước',
    'khi',
    'nếu',
    'vì',
    'nên',
    'mà',
    'đã',
    'sẽ',
    'đang',
    'vào',
    'ra',
    'lên',
    'xuống',
    'qua',
    'lại',
    'cũng',
    'còn',
    'đều',
    'đã'
])

// English stopwords
const ENGLISH_STOPWORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'must',
    'can',
    'this',
    'that',
    'these',
    'those'
])

/**
 * Remove Vietnamese diacritics from text
 * Converts: "Trí tuệ nhân tạo" → "tri tue nhan tao"
 */
export function removeDiacritics(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
}

/**
 * Normalize text for embedding generation
 * - Lowercase
 * - Remove parentheses and content: "(Cơ bản)" → ""
 * - Remove diacritics
 * - Clean special characters
 * - Trim extra whitespace
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/\([^)]*\)/g, '') // Remove parentheses and content
        .replace(/\[[^\]]*\]/g, '') // Remove brackets and content
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w\s-]/g, ' ') // Replace special chars with space
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim()
}

/**
 * Remove stopwords from text
 */
export function removeStopwords(text: string, language: 'vi' | 'en' | 'both' = 'both'): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const stopwords =
        language === 'vi'
            ? VIETNAMESE_STOPWORDS
            : language === 'en'
              ? ENGLISH_STOPWORDS
              : new Set([...VIETNAMESE_STOPWORDS, ...ENGLISH_STOPWORDS])

    return words.filter((word) => !stopwords.has(word) && word.length > 1)
}

/**
 * Full text preprocessing pipeline
 * Normalize → Remove stopwords → Join
 */
export function preprocessText(text: string, removeStopwordsFlag = false): string {
    const normalized = normalizeText(text)

    if (removeStopwordsFlag) {
        const words = removeStopwords(normalized)
        return words.join(' ')
    }

    return normalized
}

/**
 * Extract keywords from text (normalized, no stopwords)
 */
export function extractKeywords(text: string): string[] {
    const normalized = normalizeText(text)
    const words = removeStopwords(normalized)

    // Remove duplicates and sort by length (longer keywords first)
    return [...new Set(words)].sort((a, b) => b.length - a.length)
}
