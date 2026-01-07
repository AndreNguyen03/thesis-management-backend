import { Controller, Get, Post, Body, Param, Query, Delete, Patch, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { RatingService } from './application/rating.service'
import { CreateRatingDto } from './dtos/create-rating.dto'
import { UpdateRatingDto } from './dtos/update-rating.dto'
import { GetRatingsQueryDto } from './dtos/get-rating.dto'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { ActiveUser } from '../../auth/decorator/active-user.decorator'

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
    constructor(private readonly ratingService: RatingService) {}

    @Post()
    @Auth(AuthType.Bearer)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo hoặc cập nhật rating cho đề tài' })
    @ApiResponse({ status: 201, description: 'Rating đã được tạo/cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Đề tài không tồn tại' })
    async createOrUpdateRating(@ActiveUser() user: ActiveUserData, @Body() createRatingDto: CreateRatingDto) {
        return await this.ratingService.createOrUpdateRating(user.sub, createRatingDto)
    }

    @Get('my-rating/:topicId')
    @Auth(AuthType.Bearer)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy rating của user hiện tại cho một đề tài' })
    @ApiResponse({ status: 200, description: 'Thành công' })
    async getMyRating(@ActiveUser() user: ActiveUserData, @Param('topicId') topicId: string) {
        return await this.ratingService.getUserRating(user.sub, topicId)
    }

    @Get('topic/:topicId')
    @ApiOperation({ summary: 'Lấy danh sách ratings của một đề tài' })
    @ApiResponse({ status: 200, description: 'Thành công' })
    async getTopicRatings(@Param('topicId') topicId: string, @Query() query: GetRatingsQueryDto) {
        const { page = 1, limit = 10 } = query
        return await this.ratingService.getTopicRatings(topicId, page, limit)
    }

    @Get('topic/:topicId/stats')
    @ApiOperation({ summary: 'Lấy thống kê rating của một đề tài' })
    @ApiResponse({ status: 200, description: 'Thành công' })
    async getTopicStats(@Param('topicId') topicId: string) {
        return await this.ratingService.getTopicStats(topicId)
    }

    @Delete('topic/:topicId')
    @Auth(AuthType.Bearer)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Xóa rating của user cho một đề tài' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
    async deleteRating(@ActiveUser() user: ActiveUserData, @Param('topicId') topicId: string) {
        return await this.ratingService.deleteRating(user.sub, topicId)
    }

    @Patch('topic/:topicId')
    @Auth(AuthType.Bearer)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật rating của user cho một đề tài' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
    async updateRating(
        @ActiveUser() user: ActiveUserData,
        @Param('topicId') topicId: string,
        @Body() updateRatingDto: UpdateRatingDto
    ) {
        return await this.ratingService.updateRating(user.sub, topicId, updateRatingDto)
    }
}
