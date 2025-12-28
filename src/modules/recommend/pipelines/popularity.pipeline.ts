export class InteractionPipeline {}
// pipelines/popularity-based.pipeline.ts (cập nhật dùng services)
import { Injectable } from '@nestjs/common'
import { TopicService } from '../../topics/application/topic.service'
import { StudentService } from '../../../users/application/student.service'
import { EnrichedRecommendation } from '../dto/recommendation-response.dto'
import { TopicInteractionService } from '../../topic_interaction/application/topic_interaction.service'

@Injectable()
export class PopularityBasedPipeline {
    constructor(
        private readonly topicService: TopicService,
        private readonly studentService: StudentService
    ) {}

    async runPipeline(studentId: string): Promise<EnrichedRecommendation[]> {
        // Lấy facultyId của sinh viên
        const student = await this.studentService.getStudentProfile(studentId)
        const facultyId = student?.facultyId
        if (!facultyId) {
            throw new Error('Không tìm thấy khoa của sinh viên')
        }

        // Lấy topics theo faculty với popularity (dùng service)
        const topics = await this.topicService.getFacultyTopicsWithPopularity(facultyId.toString())

        // Enrich với badges/explanations đơn giản dựa trên popularity
        const recommendations = topics.map((topic: any) => {
            const badges: string[] = []
            if (topic.popularityScore >= 50) badges.push('Đề Tài Phổ Biến Cao')
            if (topic.interactionCount >= 10) badges.push('Tương Tác Nhiều')
            badges.push('Thuộc Khoa Của Bạn')

            const explanations = {
                khoa: 'Phù hợp khoa của sinh viên',
                tuongTac: topic.interactionCount,
                phoBien: Math.round(topic.popularityScore),
                trangThai: topic.currentStatus
            }

            return {
                ...topic,
                badges,
                explanations,
                initialScore: topic.popularityScore / 100, // Normalize
                rerankScore: 0,
                finalScore: topic.popularityScore / 100
            } as EnrichedRecommendation
        })

        return recommendations
    }
}
