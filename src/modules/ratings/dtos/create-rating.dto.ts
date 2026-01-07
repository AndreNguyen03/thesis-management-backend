import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateRatingDto {
	@ApiProperty({ description: 'ID của đề tài', example: '673abc123def456' })
	@IsNotEmpty({ message: 'Topic ID không được để trống' })
	@IsString()
	topicId: string

	@ApiProperty({ description: 'Điểm đánh giá từ 1-5 sao', example: 5, minimum: 1, maximum: 5 })
	@IsNotEmpty({ message: 'Rating không được để trống' })
	@IsNumber()
	@Min(1, { message: 'Rating tối thiểu là 1 sao' })
	@Max(5, { message: 'Rating tối đa là 5 sao' })
	rating: number

	@ApiProperty({ description: 'Bình luận về đề tài (tùy chọn)', required: false, example: 'Đề tài rất hay!' })
	@IsOptional()
	@IsString()
	comment?: string
}
