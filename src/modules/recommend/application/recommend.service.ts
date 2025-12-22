import { Injectable } from '@nestjs/common'
import { ContentBasedPipeline } from '../pipelines/content-based.pipeline'
import { PopularityBasedPipeline } from '../pipelines/popularity.pipeline'
import { StudentService } from '../../../users/application/student.service'
import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { EnrichedRecommendation } from '../dto/recommendation-response.dto'

@Injectable()
export class RecommendService {
    constructor(
        private readonly contentBasedPipeline: ContentBasedPipeline,
        private readonly popularityBasedPipeline: PopularityBasedPipeline,
        private readonly studentService: StudentService
    ) {}

    async getRecommendations(studentId: string): Promise<EnrichedRecommendation[]> {
        const profile: StudentProfileDto | null = await this.studentService.getStudentProfile(studentId)

        // Kiểm tra profile đầy đủ (có skills, interests, bio)
        const hasFullProfile =
            profile &&
            (profile.skills?.length || 0) > 0 &&
            (profile.interests?.length || 0) > 0 &&
            (profile.bio?.trim().length || 0) > 0

        if (hasFullProfile) {
            // Chạy content-based pipeline
            return await this.contentBasedPipeline.runPipeline(studentId)
        } else {
            // Fallback: Chạy popularity-based pipeline
            return await this.popularityBasedPipeline.runPipeline(studentId)
        }
    }
}
