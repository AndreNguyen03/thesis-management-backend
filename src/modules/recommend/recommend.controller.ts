import { Controller, Get, HttpException, HttpStatus, Param, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { RecommendationService } from './application/recommend.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('recommend')
@Auth(AuthType.Bearer)
export class RecommendController {
    constructor(private readonly recommendationService: RecommendationService) {}

    @Get('/period/:periodId')
    async getRecommendations(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Query('limit') limit?: number
    ) {
        try {
            const result = await this.recommendationService.getRecommendationsForStudent(req.user.sub, periodId, {
                limit: limit ? parseInt(limit.toString()) : undefined
            })

            if (!result.success) {
                throw new HttpException(
                    {
                        statusCode: HttpStatus.BAD_REQUEST,
                        message: result.message || 'Không thể tạo đề xuất',
                        data: result
                    },
                    HttpStatus.BAD_REQUEST
                )
            }

            return {
                statusCode: HttpStatus.OK,
                message: 'Lấy đề xuất thành công',
                data: result.data,
                metadata: result.metadata
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error
            }

            throw new HttpException(
                {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Lỗi hệ thống khi tạo đề xuất'
                },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
