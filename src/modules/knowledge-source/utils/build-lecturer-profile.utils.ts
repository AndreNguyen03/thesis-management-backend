export function buildProfileText(lecturer: any, user: any, faculty: any): string {
    const sections: string[] = []

    // 1. Basic info (lặp lại để tăng trọng số)
    sections.push(`Giảng viên: ${user.fullName}`)
    sections.push(`Tên: ${user.fullName}`)
    sections.push(`Email: ${user.email}`)
    sections.push(`Học hàm: ${lecturer.title}`)

    // 2. Faculty
    if (faculty?.name) {
        sections.push(`Khoa: ${faculty.name}`)
    }

    // 3. Bio (nếu có)
    if (user.bio) {
        sections.push(`\nTiểu sử:\n${user.bio}`)
    }

    // 4. Research interests (LẶP 2 LẦN để tăng độ ưu tiên)
    if (lecturer.researchInterests && lecturer.researchInterests.length > 0) {
        const interests = lecturer.researchInterests.join(', ')
        sections.push(`\nLĩnh vực nghiên cứu: ${interests}`)
        sections.push(`Chuyên môn: ${interests}`) // Lặp lại với từ khóa khác
    }

    // 5. Area of interest
    if (lecturer.areaInterest && lecturer.areaInterest.length > 0) {
        sections.push(`Lĩnh vực quan tâm: ${lecturer.areaInterest.join(', ')}`)
    }

    // 6. Publications (top 5 most cited)
    if (lecturer.publications && lecturer.publications.length > 0) {
        const topPubs = lecturer.publications
            .sort((a, b) => (b.citations || 0) - (a.citations || 0))
            .slice(0, 5)
            .map((p) => `- ${p.title} (${p.year}${p.citations ? `, ${p.citations} citations` : ''})`)
            .join('\n')

        sections.push(`\nCông trình nghiên cứu:\n${topPubs}`)
    }

    // 7. Keywords extraction từ publications
    if (lecturer.publications && lecturer.publications.length > 0) {
        const keywords = lecturer.publications
            .map((p) => p.title)
            .join(' ')
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 4) // Lọc từ ngắn
            .slice(0, 20) // Top 20 keywords
            .join(' ')

        sections.push(`\nTừ khóa nghiên cứu: ${keywords}`)
    }

    return sections.join('\n').trim()
}
