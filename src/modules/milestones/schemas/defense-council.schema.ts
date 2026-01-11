import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { MilestoneTemplate } from './milestones-templates.schema'
import { User } from '../../../users/schemas/users.schema'
import { Topic } from '../../topics/schemas/topic.schemas'
export enum CouncilMemberRole {
    CHAIRPERSON = 'chairperson',
    SECRETARY = 'secretary',
    MEMBER = 'member',
    REVIEWER = 'reviewer'
}
// Thành viên hội đồng (CHUNG cho tất cả đề tài trong hội đồng)
@Schema({ _id: false })
export class CouncilMember {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    memberId: string

    @Prop({ required: true })
    fullName: string

    @Prop({ default: '' })
    title: string // TS, PGS.TS, GS.TS

    @Prop({
        type: String,
        enum: CouncilMemberRole,
        required: true
    })
    role: string
}

export const CouncilMemberSchema = SchemaFactory.createForClass(CouncilMember)

export enum ScoreType {
    CHAIRPERSON = 'chairperson',
    SECRETARY = 'secretary',
    MEMBER = 'member',
    REVIEWER = 'reviewer',
    SUPERVISOR = 'supervisor'
}

// Điểm số từ 1 thành viên
@Schema({ _id: false })
export class Score {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    scorerId: string

    @Prop({ required: true })
    scorerName: string

    @Prop({
        type: String,
        enum: ScoreType,
        required: true
    })
    scoreType: ScoreType

    @Prop({ type: Number, min: 0, max: 10 })
    total: number // Tổng điểm

    @Prop({ default: '' })
    comment: string

    @Prop({ type: Date, default: Date.now })
    scoredAt: Date
}

export const ScoreSchema = SchemaFactory.createForClass(Score)

// Phân công đề tài + phản biện + điểm
@Schema({ _id: false })
export class TopicAssignment {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Topic.name, required: true })
    topicId: string

    @Prop({ required: true })
    titleVN: string

    @Prop({ default: '' })
    titleEng: string

    @Prop({ type: [String], default: [] })
    studentNames: string[]

    @Prop({ type: Number, default: 0 })
    defenseOrder: number // Thứ tự bảo vệ (1, 2, 3...)

    @Prop({ type: [Score], default: [] })
    scores: Score[] // Điểm từ hội đồng và phản biện và giảng viên hướng dẫn

    @Prop({ type: Number })
    finalScore: number // Điểm tổng kết
    @Prop({ type: [CouncilMember], default: [] })
    members: CouncilMember[]
}

export const TopicAssignmentSchema = SchemaFactory.createForClass(TopicAssignment)

// Hội đồng bảo vệ
@Schema({ timestamps: true, collection: 'defense_councils' })
export class DefenseCouncil extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: MilestoneTemplate.name, required: true })
    milestoneTemplateId: string // Đợt bảo vệ

    @Prop({ required: true })
    name: string // VD: "Hội đồng 1 - Phòng E03.2"

    @Prop({ required: true })
    location: string // Phòng bảo vệ

    @Prop({ type: Date, required: true })
    scheduledDate: Date // Thời gian bảo vệ

    @Prop({ type: [TopicAssignment], default: [] })
    topics: TopicAssignment[] // Các đề tài trong hội đồng, mỗi đề tài có bộ ba riêng

    @Prop({ default: false })
    isCompleted: boolean // Đã hoàn thành chấm điểm

    @Prop({ default: false })
    isPublished: boolean // Đã công bố điểm

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    createdBy: string
}

export const DefenseCouncilSchema = SchemaFactory.createForClass(DefenseCouncil)

// Indexes
DefenseCouncilSchema.index({ milestoneTemplateId: 1, scheduledDate: 1 })
DefenseCouncilSchema.index({ 'topics.topicId': 1 })
DefenseCouncilSchema.index({ 'topics.members.memberId': 1 })
