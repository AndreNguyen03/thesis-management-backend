import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { RatingRepository } from '../repository/rating.repository'
import { CreateRatingDto } from '../dtos/create-rating.dto'
import { UpdateRatingDto } from '../dtos/update-rating.dto'
import { Rating } from '../schemas/rating.schemas'
import { RatingStatsDto } from '../dtos/get-rating.dto'
import { Topic } from '../../topics/schemas/topic.schemas'
import { TopicStatus } from '../../topics/enum'

@Injectable()
export class RatingService {
    constructor(
        private readonly ratingRepository: RatingRepository,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>
    ) {}

    /**
     * Tạo hoặc cập nhật rating của user
     */
    async createOrUpdateRating(userId: string, createRatingDto: CreateRatingDto): Promise<Rating> {
        // Kiểm tra topic có tồn tại không
        const topic = await this.topicModel.findById(createRatingDto.topicId)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại')
        }

        // Kiểm tra topic có được publish ra thư viện không
        if (topic.currentStatus !== TopicStatus.Archived) {
            throw new BadRequestException('Đề tài chưa được xuất bản ra thư viện')
        }

        // Tạo hoặc cập nhật rating
        const rating = await this.ratingRepository.createOrUpdate(userId, createRatingDto)

        // Cập nhật lại stats của topic
        await this.updateTopicStats(createRatingDto.topicId)

        return rating
    }

    /**
     * Lấy rating của user cho một topic
     */
    async getUserRating(userId: string, topicId: string): Promise<Rating | null> {
        return await this.ratingRepository.findByUserAndTopic(userId, topicId)
    }

    /**
     * Lấy danh sách ratings của một topic
     */
    async getTopicRatings(topicId: string, page: number = 1, limit: number = 10) {
        const topic = await this.topicModel.findById(topicId)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại')
        }

        return await this.ratingRepository.findByTopic(topicId, page, limit)
    }

    /**
     * Lấy thống kê rating của một topic
     */
    async getTopicStats(topicId: string): Promise<RatingStatsDto> {
        const topic = await this.topicModel.findById(topicId)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại')
        }

        return await this.ratingRepository.getTopicStats(topicId)
    }

    /**
     * Xóa rating (chỉ user tạo ra mới được xóa)
     */
    async deleteRating(userId: string, topicId: string): Promise<boolean> {
        const rating = await this.ratingRepository.findByUserAndTopic(userId, topicId)
        if (!rating) {
            throw new NotFoundException('Không tìm thấy đánh giá')
        }

        const deleted = await this.ratingRepository.delete(rating._id.toString())

        // Cập nhật lại stats của topic
        if (deleted) {
            await this.updateTopicStats(topicId)
        }

        return deleted
    }

    /**
     * Cập nhật rating
     */
    async updateRating(userId: string, topicId: string, updateRatingDto: UpdateRatingDto): Promise<Rating> {
        const rating = await this.ratingRepository.findByUserAndTopic(userId, topicId)
        if (!rating) {
            throw new NotFoundException('Không tìm thấy đánh giá')
        }

        const updated = await this.ratingRepository.update(rating._id.toString(), updateRatingDto)

        // Cập nhật lại stats của topic
        await this.updateTopicStats(topicId)

        return updated
    }

    /**
     * Cập nhật stats (averageRating, reviewCount) của topic
     */
    private async updateTopicStats(topicId: string): Promise<void> {
        const stats = await this.ratingRepository.getTopicStats(topicId)

        await this.topicModel.findByIdAndUpdate(new mongoose.Types.ObjectId(topicId), {
            'stats.averageRating': stats.averageRating,
            'stats.reviewCount': stats.totalRatings
        })
    }
}
