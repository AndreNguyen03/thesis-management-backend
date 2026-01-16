// Technical abbreviations map for expansion
const TECH_ABBREVIATIONS = new Map([
    ['ai', 'AI artificial intelligence trí tuệ nhân tạo machine learning deep learning'],
    ['ml', 'ML machine learning học máy supervised unsupervised'],
    ['dl', 'DL deep learning học sâu neural network'],
    ['nlp', 'NLP natural language processing xử lý ngôn ngữ tự nhiên'],
    ['cv', 'CV computer vision thị giác máy tính image processing'],
    ['iot', 'IoT internet of things vạn vật kết nối embedded sensor'],
    ['blockchain', 'blockchain chuỗi khối cryptocurrency smart contract web3'],
    ['web', 'web website ứng dụng web frontend backend fullstack'],
    ['mobile', 'mobile di động android ios react native flutter'],
    ['data', 'data science phân tích dữ liệu big data analytics'],
    ['cloud', 'cloud computing điện toán đám mây AWS azure'],
    ['security', 'security bảo mật cybersecurity an ninh mạng'],
    ['network', 'network mạng máy tính networking protocol']
])

/**
 * Expand technical abbreviations in text
 */
function expandAbbreviations(text: string): string {
    let expanded = text

    TECH_ABBREVIATIONS.forEach((expansion, abbr) => {
        const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
        if (regex.test(expanded)) {
            expanded = expanded.replace(regex, `${abbr} ${expansion}`)
        }
    })

    return expanded
}

export function buildProfileText(lecturer: any, user: any, faculty: any): string {
    const sections: string[] = []

    // ===== SECTION 1: IDENTITY (High Priority - Repeat 3x) =====
    const fullName = user.fullName
    sections.push(`[NAME] Giảng viên: ${fullName}`)
    sections.push(`[NAME] Tên: ${fullName}`)
    sections.push(`[NAME] Họ tên: ${fullName}`) // Third repetition
    sections.push(`[CONTACT] Email: ${user.email}`)

    // Title with repetition
    if (lecturer.title) {
        sections.push(`[TITLE] Học hàm: ${lecturer.title}`)
        sections.push(`[TITLE] ${lecturer.title}`) // Repeat for weight
    }

    // ===== SECTION 2: AFFILIATION =====
    if (faculty?.name) {
        sections.push(`[FACULTY] Khoa: ${faculty.name}`)
    }

    // ===== SECTION 3: EXPERTISE (Highest Priority - Repeat 3x + Expansion) =====
    if (lecturer.researchInterests && lecturer.researchInterests.length > 0) {
        const interests = lecturer.researchInterests.join(', ')
        const expandedInterests = expandAbbreviations(interests)

        // Repeat 3 times with variations
        sections.push(`[EXPERTISE] Lĩnh vực nghiên cứu: ${expandedInterests}`)
        sections.push(`[EXPERTISE] Chuyên môn: ${expandedInterests}`)
        sections.push(`[EXPERTISE] Research interests: ${expandedInterests}`)
    }

    // Area of interest (Repeat 2x + Expansion)
    if (lecturer.areaInterest && lecturer.areaInterest.length > 0) {
        const areas = lecturer.areaInterest.join(', ')
        const expandedAreas = expandAbbreviations(areas)

        sections.push(`[EXPERTISE] Lĩnh vực quan tâm: ${expandedAreas}`)
        sections.push(`[EXPERTISE] Areas of interest: ${expandedAreas}`)
    }

    // ===== SECTION 4: BIO (Medium Priority + Expansion) =====
    if (user.bio) {
        const expandedBio = expandAbbreviations(user.bio)
        sections.push(`[BIO] Tiểu sử: ${expandedBio}`)
    }

    // ===== SECTION 5: PUBLICATIONS (With Keywords Extraction) =====
    if (lecturer.publications && lecturer.publications.length > 0) {
        // Top publications by citations
        const topPubs = lecturer.publications.sort((a, b) => (b.citations || 0) - (a.citations || 0)).slice(0, 5)

        const pubTexts = topPubs
            .map((p) => {
                const expandedTitle = expandAbbreviations(p.title)
                return `- ${expandedTitle} (${p.year}${p.citations ? `, ${p.citations} citations` : ''})`
            })
            .join('\n')

        sections.push(`[PUBLICATIONS] Công trình nghiên cứu:\n${pubTexts}`)

        // Extract and expand keywords from publications
        const allPubTitles = lecturer.publications.map((p) => p.title).join(' ')
        const expandedPubText = expandAbbreviations(allPubTitles)

        const keywords = expandedPubText
            .toLowerCase()
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .filter((w, idx, arr) => arr.indexOf(w) === idx) // Unique
            .slice(0, 30) // Top 30 keywords

        if (keywords.length > 0) {
            sections.push(`[KEYWORDS] Từ khóa nghiên cứu: ${keywords.join(' ')}`)
        }
    }

    // ===== SECTION 6: STRUCTURED METADATA (For Better Matching) =====
    // Repeat key terms at the end for additional weight
    const keyTerms: string[] = []

    if (lecturer.researchInterests?.length > 0) {
        keyTerms.push(...lecturer.researchInterests)
    }
    if (lecturer.areaInterest?.length > 0) {
        keyTerms.push(...lecturer.areaInterest)
    }

    if (keyTerms.length > 0) {
        const expandedKeyTerms = expandAbbreviations(keyTerms.join(' '))
        sections.push(`[METADATA] ${expandedKeyTerms}`)
    }

    return sections.join('\n').trim()
}
