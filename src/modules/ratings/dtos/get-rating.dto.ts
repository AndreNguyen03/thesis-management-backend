import { IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class GetRatingsQueryDto {
	@ApiProperty({ description: 'ID của đề tài cần lấy đánh giá', required: false })
	@IsOptional()
	@IsString()
	topicId?: string

	@ApiProperty({ description: 'Số trang', required: false, default: 1 })
	@IsOptional()
	page?: number

	@ApiProperty({ description: 'Số lượng mỗi trang', required: false, default: 10 })
	@IsOptional()
	limit?: number
}

export class RatingStatsDto {
	averageRating: number
	totalRatings: number
	distribution: {
		'1': number
		'2': number
		'3': number
		'4': number
		'5': number
	}
}
