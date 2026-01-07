import { Rating } from '../schemas/rating.schemas'
import { CreateRatingDto } from '../dtos/create-rating.dto'
import { UpdateRatingDto } from '../dtos/update-rating.dto'
import { RatingStatsDto } from '../dtos/get-rating.dto'

export interface RatingRepositoryInterface {
	// Tạo hoặc cập nhật rating của user cho topic
	createOrUpdate(userId: string, createRatingDto: CreateRatingDto): Promise<Rating>

	// Lấy rating của một user cho một topic cụ thể
	findByUserAndTopic(userId: string, topicId: string): Promise<Rating | null>

	// Lấy tất cả ratings của một topic (có phân trang)
	findByTopic(topicId: string, page?: number, limit?: number): Promise<{ ratings: Rating[]; total: number }>

	// Lấy thống kê rating cho một topic
	getTopicStats(topicId: string): Promise<RatingStatsDto>

	// Xóa rating
	delete(ratingId: string): Promise<boolean>

	// Cập nhật rating
	update(ratingId: string, updateRatingDto: UpdateRatingDto): Promise<Rating>
}
