/**
 * Utility functions for calculating final scores and grade classification
 */

/**
 * Calculate final score from array of scores
 * @param scores Array of score values
 * @returns Average score rounded to 2 decimal places
 */
export function calculateFinalScore(scores: number[]): number {
    if (!scores || scores.length === 0) {
        return 0
    }

    const sum = scores.reduce((acc, score) => acc + score, 0)
    const average = sum / scores.length

    return Math.round(average * 100) / 100
}

/**
 * Get grade text based on final score
 * @param finalScore Final average score
 * @returns Grade text in Vietnamese
 */
export function getGradeText(finalScore: number): string {
    if (finalScore >= 9.0) {
        return 'Xuất sắc'
    } else if (finalScore >= 8.0) {
        return 'Giỏi'
    } else if (finalScore >= 7.0) {
        return 'Khá'
    } else if (finalScore >= 5.5) {
        return 'Trung bình'
    } else if (finalScore >= 4.0) {
        return 'Yếu'
    } else {
        return 'Kém'
    }
}

/**
 * Calculate final score and grade for a topic
 * @param scores Array of score values
 * @returns Object with finalScore and gradeText
 */
export function calculateScoreAndGrade(scores: number[]): { finalScore: number; gradeText: string } {
    const finalScore = calculateFinalScore(scores)
    const gradeText = getGradeText(finalScore)

    return { finalScore, gradeText }
}
