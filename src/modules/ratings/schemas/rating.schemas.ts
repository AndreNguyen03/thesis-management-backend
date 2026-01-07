import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Topic } from '../../topics/schemas/topic.schemas'
import { User } from '../../../users/schemas/users.schema'

@Schema({ collection: 'ratings', timestamps: true })
export class Rating extends BaseEntity {
	@Prop({ type: mongoose.Schema.Types.ObjectId, ref: Topic.name, required: true, index: true })
	topicId: string

	@Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true, index: true })
	userId: string

	@Prop({ type: Number, required: true, min: 1, max: 5 })
	rating: number // 1-5 sao

	@Prop({ type: String, required: false, maxlength: 1000 })
	comment?: string // Bình luận (optional)

	@Prop({ type: Date, default: Date.now })
	createdAt: Date

	@Prop({ type: Date, default: Date.now })
	updatedAt: Date
}

export const RatingSchema = SchemaFactory.createForClass(Rating)

// Index để đảm bảo 1 user chỉ vote 1 lần cho 1 topic
RatingSchema.index({ topicId: 1, userId: 1 }, { unique: true })
