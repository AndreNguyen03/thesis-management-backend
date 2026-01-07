import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Rating } from '../schemas/rating.schemas'
import { RatingRepositoryInterface } from './rating.repository.interface'
import { CreateRatingDto } from '../dtos/create-rating.dto'
import { UpdateRatingDto } from '../dtos/update-rating.dto'
import { RatingStatsDto } from '../dtos/get-rating.dto'
import mongoose from 'mongoose'

@Injectable()
export class RatingRepository implements RatingRepositoryInterface {
	constructor(
		@InjectModel(Rating.name)
		private readonly ratingModel: Model<Rating>
	) {}

	async createOrUpdate(userId: string, createRatingDto: CreateRatingDto): Promise<Rating> {
		const { topicId, rating, comment } = createRatingDto

		// Tìm rating hiện có
		const existingRating = await this.ratingModel.findOne({
			userId,
			topicId
		})

		if (existingRating) {
			// Cập nhật rating hiện có
			existingRating.rating = rating
			if (comment !== undefined) {
				existingRating.comment = comment
			}
			existingRating.updatedAt = new Date()
			return await existingRating.save()
		}

		// Tạo mới rating
		const newRating = new this.ratingModel({
			userId,
			topicId,
			rating,
			comment
		})

		return await newRating.save()
	}

	async findByUserAndTopic(userId: string, topicId: string): Promise<Rating | null> {
		return await this.ratingModel
			.findOne({
				userId,
				topicId
			})
			.exec()
	}

	async findByTopic(
		topicId: string,
		page: number = 1,
		limit: number = 10
	): Promise<{ ratings: Rating[]; total: number }> {
		const skip = (page - 1) * limit

		const [ratings, total] = await Promise.all([
			this.ratingModel
				.find({ topicId })
				.populate('userId', 'fullName email') // Populate thông tin user
				.sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
				.skip(skip)
				.limit(limit)
				.exec(),
			this.ratingModel.countDocuments({ topicId })
		])

		return { ratings, total }
	}

	async getTopicStats(topicId: string): Promise<RatingStatsDto> {
		// Aggregate để tính toán thống kê
		const stats = await this.ratingModel.aggregate([
			{ $match: { topicId: new mongoose.Types.ObjectId(topicId) } },
			{
				$group: {
					_id: null,
					averageRating: { $avg: '$rating' },
					totalRatings: { $sum: 1 },
					ratings: { $push: '$rating' }
				}
			}
		])

		if (!stats || stats.length === 0) {
			return {
				averageRating: 0,
				totalRatings: 0,
				distribution: {
					'1': 0,
					'2': 0,
					'3': 0,
					'4': 0,
					'5': 0
				}
			}
		}

		const { averageRating, totalRatings, ratings } = stats[0]

		// Tính phân bố rating
		const distribution = {
			'1': 0,
			'2': 0,
			'3': 0,
			'4': 0,
			'5': 0
		}

		ratings.forEach((rating: number) => {
			if (rating >= 1 && rating <= 5) {
				distribution[rating.toString() as keyof typeof distribution]++
			}
		})

		return {
			averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
			totalRatings,
			distribution
		}
	}

	async delete(ratingId: string): Promise<boolean> {
		const result = await this.ratingModel.deleteOne({ _id: ratingId })
		return result.deletedCount > 0
	}

	async update(ratingId: string, updateRatingDto: UpdateRatingDto): Promise<Rating> {
		const rating = await this.ratingModel.findById(ratingId)
		if (!rating) {
			throw new Error('Rating not found')
		}

		if (updateRatingDto.rating !== undefined) {
			rating.rating = updateRatingDto.rating
		}
		if (updateRatingDto.comment !== undefined) {
			rating.comment = updateRatingDto.comment
		}
		rating.updatedAt = new Date()

		return await rating.save()
	}
}
