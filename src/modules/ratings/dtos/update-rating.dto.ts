import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateRatingDto {
	@ApiProperty({ description: 'Điểm đánh giá từ 1-5 sao', example: 4, minimum: 1, maximum: 5 })
	@IsOptional()
	@IsNumber()
	@Min(1, { message: 'Rating tối thiểu là 1 sao' })
	@Max(5, { message: 'Rating tối đa là 5 sao' })
	rating?: number

	@ApiProperty({ description: 'Bình luận về đề tài', required: false, example: 'Cập nhật: Đề tài xuất sắc!' })
	@IsOptional()
	@IsString()
	comment?: string
}
