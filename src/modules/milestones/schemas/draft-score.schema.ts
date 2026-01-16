import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { DetailedCriterionScore, DetailedCriterionScoreSchema } from './defense-council.schema'

/**
 * Draft Score - Lưu tạm điểm đang soạn thảo (chưa submit chính thức)
 * Auto-delete sau 7 ngày hoặc khi submit thành công
 */
@Schema({ timestamps: true, collection: 'draft_scores' })
export class DraftScore extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'DefenseCouncil', required: true, index: true })
    councilId: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true })
    topicId: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
    scorerId: string // Giảng viên đang chấm

    @Prop() // Optional - nếu chấm riêng từng sinh viên
    studentId?: string

    @Prop({ type: [DetailedCriterionScoreSchema], default: [] })
    detailedScores: DetailedCriterionScore[]

    @Prop({ default: '' })
    comment: string

    @Prop({ type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }) // 7 days
    expiresAt: Date
}

export const DraftScoreSchema = SchemaFactory.createForClass(DraftScore)

// TTL index để auto-delete expired drafts
DraftScoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Compound unique index: 1 draft per scorer + topic + student
DraftScoreSchema.index({ councilId: 1, topicId: 1, scorerId: 1, studentId: 1 }, { unique: true })
