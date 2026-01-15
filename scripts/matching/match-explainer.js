/**
 * Match Explainer - Pipeline 2, Step 9
 * Generate human-readable explanations using LLM (optional)
 */

/**
 * Generate explanation WITHOUT LLM (template-based)
 */
function generateBasicExplanation(matchResult, studentProfile, lecturerProfile) {
    const { matchedConcepts, score, conceptCount } = matchResult

    const explanations = []

    // Group by concept for cleaner explanation
    const conceptGroups = new Map()

    matchedConcepts.forEach((mc) => {
        if (!conceptGroups.has(mc.key)) {
            conceptGroups.set(mc.key, mc)
        }
    })

    for (const [key, concept] of conceptGroups) {
        const studentSources = concept.studentSources.join(', ')
        const lecturerSources = concept.lecturerSources.join(', ')

        explanations.push({
            key: concept.key,
            label: concept.label,
            reason: `Cả hai cùng chuyên về ${concept.label}`,
            detail: `Sinh viên quan tâm (từ ${studentSources}), Giảng viên nghiên cứu (từ ${lecturerSources})`,
            weight: concept.weight
        })
    }

    return {
        summary: `Match với ${conceptCount} concept(s) chung, tổng điểm: ${score.toFixed(2)}`,
        matchedConcepts: explanations,
        score
    }
}

/**
 * Generate explanation WITH LLM (placeholder - can integrate with actual LLM)
 */
async function generateLLMExplanation(matchResult, studentProfile, lecturerProfile, llmClient) {
    // Basic fallback if no LLM client
    if (!llmClient) {
        return generateBasicExplanation(matchResult, studentProfile, lecturerProfile)
    }

    const { matchedConcepts } = matchResult

    const conceptList = matchedConcepts.map((mc) => mc.label).join(', ')

    const prompt = `
Bạn là trợ lý tư vấn học thuật. Hãy giải thích tại sao sinh viên và giảng viên này phù hợp.

Sinh viên:
- Kỹ năng: ${studentProfile.skills?.join(', ') || 'N/A'}
- Quan tâm: ${studentProfile.interests?.join(', ') || 'N/A'}

Giảng viên:
- Chức danh: ${lecturerProfile.title}
- Lĩnh vực: ${lecturerProfile.areaInterest?.join(', ') || 'N/A'}
- Nghiên cứu: ${lecturerProfile.researchInterests?.join(', ') || 'N/A'}

Các concept match: ${conceptList}

Hãy viết 2-3 câu ngắn gọn giải thích sự phù hợp, tập trung vào chuyên môn chung.
`.trim()

    try {
        const response = await llmClient.generate(prompt)

        return {
            summary: response.text,
            matchedConcepts: matchResult.matchedConcepts.map((mc) => ({
                key: mc.key,
                label: mc.label,
                reason: `Cả hai cùng chuyên về ${mc.label}`
            })),
            score: matchResult.score
        }
    } catch (error) {
        console.error('LLM explanation failed, falling back to basic:', error.message)
        return generateBasicExplanation(matchResult, studentProfile, lecturerProfile)
    }
}

/**
 * Format explanation cho display
 */
function formatExplanation(explanation) {
    const lines = []

    lines.push(`📊 Score: ${explanation.score.toFixed(2)}`)
    lines.push(`📝 ${explanation.summary}`)
    lines.push('')
    lines.push('🎯 Matched Concepts:')

    explanation.matchedConcepts.forEach((mc, idx) => {
        lines.push(`  ${idx + 1}. ${mc.label}`)
        lines.push(`     ${mc.reason}`)
        if (mc.detail) {
            lines.push(`     ${mc.detail}`)
        }
    })

    return lines.join('\n')
}

/**
 * Batch generate explanations cho nhiều matches
 */
async function explainMatches(matches, studentProfile, lecturerProfiles, options = {}) {
    const { useLLM = false, llmClient = null } = options

    const explained = []

    for (const match of matches) {
        const lecturerProfile = lecturerProfiles.find((l) => l._id === match.lecturerId)

        if (!lecturerProfile) continue

        const explanation = useLLM
            ? await generateLLMExplanation(match, studentProfile, lecturerProfile, llmClient)
            : generateBasicExplanation(match, studentProfile, lecturerProfile)

        explained.push({
            ...match,
            explanation
        })
    }

    return explained
}

module.exports = {
    generateBasicExplanation,
    generateLLMExplanation,
    formatExplanation,
    explainMatches
}
