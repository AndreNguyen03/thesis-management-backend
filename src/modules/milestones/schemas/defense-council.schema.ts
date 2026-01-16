import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { MilestoneTemplate } from './milestones-templates.schema'
import { EvaluationTemplate } from './evaluation-template.schema'
import { User } from '../../../users/schemas/users.schema'
import { Topic } from '../../topics/schemas/topic.schemas'
export enum CouncilMemberRole {
    CHAIRPERSON = 'chairperson',
    SECRETARY = 'secretary',
    MEMBER = 'member',
    REVIEWER = 'reviewer',
    SUPERVISOR = 'supervisor'
}

// Student in council
@Schema({ _id: false })
export class StudentInCouncil {
    @Prop({ required: true })
    userId: string

    @Prop({ required: true })
    fullName: string

    @Prop()
    studentCode?: string

    @Prop()
    email?: string
}

export const StudentInCouncilSchema = SchemaFactory.createForClass(StudentInCouncil)

// Lecturer in council
@Schema({ _id: false })
export class LecturerInCouncil {
    @Prop({ required: true })
    userId: string

    @Prop({ required: true })
    fullName: string

    @Prop({ required: true })
    title: string

    @Prop()
    email?: string
}

export const LecturerInCouncilSchema = SchemaFactory.createForClass(LecturerInCouncil)

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

// Điểm chi tiết cho từng tiêu chí (reference đến EvaluationTemplate)
@Schema({ _id: false })
export class DetailedCriterionScore {
    @Prop({ required: true })
    criterionId: string // "1", "2", "3", "4" - reference to EvaluationCriterion.id

    @Prop() // Optional - chỉ có khi chấm subcriteria
    subcriterionId?: string // "1.1", "1.2" - reference to SubCriterion.id

    @Prop({ type: Number, min: 0, required: true })
    score: number // Điểm thực tế giảng viên chấm

    @Prop({ type: Number, min: 0, required: true })
    maxScore: number // Copy từ template để preserve khi template thay đổi

    @Prop({ default: '' })
    elo: string // Copy từ template để preserve
}

export const DetailedCriterionScoreSchema = SchemaFactory.createForClass(DetailedCriterionScore)
// Điểm số từ 1 thành viên hội đồng
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
    total: number // Tổng điểm (tự động tính từ detailedScores hoặc nhập thủ công cho hệ thống cũ)

    @Prop({ default: '' })
    comment: string

    // Điểm chi tiết theo từng tiêu chí - NEW FEATURE
    @Prop({ type: [DetailedCriterionScore], default: [] })
    detailedScores?: DetailedCriterionScore[] // Optional để tương thích với data cũ

    // Nếu chấm riêng từng sinh viên trong nhóm
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name})
    studentId?: string // Optional - chỉ dùng khi topic có nhiều SV và chấm riêng

    @Prop({ type: Date, default: Date.now })
    scoredAt: Date

    // Audit trail
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    lastModifiedBy?: string

    @Prop({ type: Date })
    lastModifiedAt?: Date
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

    @Prop({ type: [StudentInCouncil], default: [] })
    students: StudentInCouncil[]

    @Prop({ type: [LecturerInCouncil], default: [] })
    lecturers: LecturerInCouncil[]

    @Prop({ type: Number, default: 0 })
    defenseOrder: number // Thứ tự bảo vệ (1, 2, 3...)

    @Prop({ type: [Score], default: [] })
    scores: Score[] // Điểm từ hội đồng và phản biện và giảng viên hướng dẫn

    @Prop({ type: Number })
    finalScore: number // Điểm tổng kết

    @Prop({ type: String })
    gradeText: string // "Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu"

    @Prop({ default: false })
    isLocked: boolean // Đã khóa điểm chưa?

    @Prop({ type: [CouncilMember], default: [] })
    members: CouncilMember[]
}

export const TopicAssignmentSchema = SchemaFactory.createForClass(TopicAssignment)

// Hội đồng bảo vệ
@Schema({ timestamps: true, collection: 'defense_councils' })
export class DefenseCouncil extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: MilestoneTemplate.name, required: true })
    milestoneTemplateId: string // Đợt bảo vệ

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: EvaluationTemplate.name })
    evaluationTemplateId?: string // Template tiêu chí đánh giá - link tới EvaluationTemplate

    @Prop({ type: Number, default: 1 })
    templateVersion?: number

    @Prop({ required: true })
    name: string // VD: "Hội đồng 1 - Phòng E03.2"

    @Prop({ required: true })
    location: string // Phòng bảo vệ

    @Prop({ type: Date, required: true })
    scheduledDate: Date // Thời gian bảo vệ

    @Prop({ type: [TopicAssignment], default: [] })
    topics: TopicAssignment[] // Các đề tài trong hội đồng, mỗi đề tài có bộ ba riêng

    //đề tài sẽ chuyển sang hoàn thành khi mà tất cả các đề tài trong hội đồng đều đã được chấm điểm và khóa
    @Prop({ default: false })
    isCompleted: boolean // Đã hoàn thành chấm điểm

    @Prop({ default: false })
    isPublished: boolean // Đã công bố điểm

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    createdBy: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    completedBy?: string // Thư ký nào khóa

    @Prop({ type: Date })
    completedAt?: Date

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    publishedBy?: string // BCN nào công bố

    @Prop({ type: Date })
    publishedAt?: Date
}

export const DefenseCouncilSchema = SchemaFactory.createForClass(DefenseCouncil)

// Indexes
DefenseCouncilSchema.index({ milestoneTemplateId: 1, scheduledDate: 1 })
DefenseCouncilSchema.index({ 'topics.topicId': 1 })
DefenseCouncilSchema.index({ 'topics.members.memberId': 1 })
