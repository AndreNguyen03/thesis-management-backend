import { Controller, Get, Param, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { RecommendService } from './application/recommend.service'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { EnrichedRecommendation } from './dto/recommendation-response.dto'
import { StudentService } from '../../users/application/student.service'
import { TopicService } from '../topics/application/topic.service'

@Controller('recommend')
@Auth(AuthType.Bearer)
export class RecommendController {
    constructor(
        private readonly recommendService: RecommendService,

        private readonly studentService: StudentService,
        private readonly topicService: TopicService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get personalized topic recommendations for current user' })
    @ApiResponse({ status: 200, description: 'List of recommended topics', type: [EnrichedRecommendation] })
    async getMyRecommendations(@Req() req: { user: ActiveUserData }): Promise<EnrichedRecommendation[]> {
        const currentUserId = req.user.sub
        return await this.recommendService.getRecommendations(currentUserId)
    }

    @Get('/debug/recommend/:studentId')
    async debug(@Param('studentId') id: string) {
        console.log('student Id: ::', id)
        return {
            student: await this.studentService.getStudentProfile(id),
            topics: await this.topicService.getCandidateTopics()
        }
    }
}
