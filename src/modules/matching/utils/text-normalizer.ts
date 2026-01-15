/**
 * Text Normalizer - Pipeline 1, Step 1
 * Chuẩn hóa text tiếng Việt/Anh cho concept mapping
 */

// Bảng chuyển đổi tiếng Việt có dấu → không dấu
const VIETNAMESE_MAP = {
    à: 'a',
    á: 'a',
    ả: 'a',
    ã: 'a',
    ạ: 'a',
    ă: 'a',
    ằ: 'a',
    ắ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    ặ: 'a',
    â: 'a',
    ầ: 'a',
    ấ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ậ: 'a',
    è: 'e',
    é: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ẹ: 'e',
    ê: 'e',
    ề: 'e',
    ế: 'e',
    ể: 'e',
    ễ: 'e',
    ệ: 'e',
    ì: 'i',
    í: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ị: 'i',
    ò: 'o',
    ó: 'o',
    ỏ: 'o',
    õ: 'o',
    ọ: 'o',
    ô: 'o',
    ồ: 'o',
    ố: 'o',
    ổ: 'o',
    ỗ: 'o',
    ộ: 'o',
    ơ: 'o',
    ờ: 'o',
    ớ: 'o',
    ở: 'o',
    ỡ: 'o',
    ợ: 'o',
    ù: 'u',
    ú: 'u',
    ủ: 'u',
    ũ: 'u',
    ụ: 'u',
    ư: 'u',
    ừ: 'u',
    ứ: 'u',
    ử: 'u',
    ữ: 'u',
    ự: 'u',
    ỳ: 'y',
    ý: 'y',
    ỷ: 'y',
    ỹ: 'y',
    ỵ: 'y',
    đ: 'd'
}

// Synonym dictionary cho concept mapping
const SYNONYMS = {
    // AI
    ai: ['artificial intelligence', 'tri tue nhan tao'],
    'machine learning': ['ml', 'hoc may'],
    'deep learning': ['dl', 'hoc sau'],
    'neural network': ['mang no ron', 'neural net'],
    nlp: ['natural language processing', 'xu ly ngon ngu tu nhien'],
    llm: ['large language model', 'mo hinh ngon ngu lon'],
    'computer vision': ['cv', 'thi giac may tinh'],

    // Data
    'data science': ['khoa hoc du lieu'],
    'big data': ['du lieu lon'],
    'data mining': ['khai pha du lieu'],
    'data analysis': ['phan tich du lieu'],

    // Software
    'software engineering': ['cong nghe phan mem'],
    'web development': ['phat trien web'],
    'mobile development': ['phat trien di dong'],
    backend: ['server side'],
    frontend: ['client side'],

    // Systems
    'cloud computing': ['dien toan dam may'],
    'distributed systems': ['he thong phan tan'],
    iot: ['internet of things', 'internet van vat'],
    'embedded systems': ['he thong nhung'],

    // Security
    cybersecurity: ['an ninh mang', 'an toan thong tin'],
    cryptography: ['ma hoa'],

    // Hardware
    vlsi: ['vi mach'],
    'ic design': ['thiet ke vi mach'],
    soc: ['system on chip'],
    fpga: ['field programmable gate array']
}

/**
 * Chuyển tiếng Việt có dấu thành không dấu
 */
export function removeVietnameseTones(text: string): string {
    return text
        .split('')
        .map((char) => VIETNAMESE_MAP[char] || char)
        .join('')
}

/**
 * Normalize một đoạn text
 */
export function normalize(text: string): string {
    if (!text || typeof text !== 'string') return ''

    // Lowercase
    text = text.toLowerCase()

    // Remove Vietnamese tones
    text = removeVietnameseTones(text)

    // Remove special characters but keep spaces and hyphens
    text = text.replace(/[^\w\s-]/g, ' ')

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim()

    return text
}

/**
 * Tách text thành tokens (phrases)
 */
export function tokenize(text: string): string[] {
    const normalized = normalize(text)
    if (!normalized) return []

    const tokens = new Set<string>()

    // Add full normalized text
    tokens.add(normalized)

    // Split by common delimiters
    const parts = normalized.split(/[,;\/&|]/)

    for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed) {
            tokens.add(trimmed)

            // Also add individual words for single-word matching
            const words = trimmed.split(/\s+/)
            if (words.length > 1) {
                words.forEach((w) => {
                    if (w.length > 2) tokens.add(w)
                })
            }
        }
    }

    return Array.from(tokens)
}

/**
 * Mở rộng tokens với synonyms
 */
export function expandWithSynonyms(tokens: string[]): string[] {
    const expanded = new Set(tokens)

    for (const token of tokens) {
        for (const [key, synonymList] of Object.entries(SYNONYMS)) {
            if (normalize(key) === token || synonymList.some((syn) => normalize(syn) === token)) {
                expanded.add(normalize(key))
                synonymList.forEach((syn) => expanded.add(normalize(syn)))
            }
        }
    }

    return Array.from(expanded)
}

/**
 * Pipeline đầy đủ: text → tokens → expanded tokens
 */
export function normalizeAndTokenize(text: string): string[] {
    const tokens = tokenize(text)
    return expandWithSynonyms(tokens)
}

/**
 * Xử lý array of texts
 */
export function normalizeArray(textArray: string[]): string[] {
    if (!Array.isArray(textArray)) return []

    const allTokens = new Set<string>()

    for (const text of textArray) {
        const tokens = normalizeAndTokenize(text)
        tokens.forEach((t) => allTokens.add(t))
    }

    return Array.from(allTokens)
}
