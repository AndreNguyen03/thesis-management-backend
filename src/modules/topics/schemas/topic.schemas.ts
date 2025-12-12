import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from '../enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { Major } from '../../majors/schemas/majors.schemas'
import { User } from '../../../users/schemas/users.schema'
import { Period } from '../../periods/schemas/period.schemas'
import { ref } from 'process'
import { Requirement } from '../../requirements/schemas/requirement.schemas'
import { File } from '../../upload-files/schemas/upload-files.schemas'
import { Field } from '../../fields/schemas/fields.schemas'

@Schema({
    timestamps: {
        createdAt: 'created_at'
    }
})
@Schema({ timestamps: true })
export class PhaseHistory extends BaseEntity {
    @Prop({ type: String, enum: PeriodPhaseName, required: true })
    phaseName: string
    @Prop({ type: String, enum: TopicStatus, default: TopicStatus.Draft })
    status: string
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    actor: string
    @Prop({ type: String, required: false })
    note: string
}
//Điểm chấm chi tiết
@Schema({ timestamps: true })
export class DetailGrade extends BaseEntity {
    @Prop({ type: Number, required: true })
    score: number
    @Prop({ type: String, required: false })
    note: string
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    actorId: string
}

@Schema()
export class Grade extends BaseEntity {
    @Prop({ type: Number })
    averageScore: number
    @Prop({ type: [DetailGrade], default: [] })
    detailGrades: DetailGrade[]
}

@Schema({ _id: false })
class CouncilMemberSnapshot {
    @Prop({ required: true }) fullName: string
    @Prop({ required: true }) role: string // "Chủ tịch", "Thư ký"...
    @Prop() workUnit: string
}

@Schema({ _id: false })
class DefenseResult {
    @Prop({ type: Date, required: true })
    defenseDate: Date // Dùng để lọc theo "Năm bảo vệ"

    @Prop({ type: String })
    periodName: string // Lưu tên đợt: "HK1 23-24" (để hiển thị nhanh)

    @Prop({ required: true })
    finalScore: number // Điểm số: 9.5

    @Prop()
    gradeText: string // Xếp loại: "Xuất sắc"

    @Prop({ type: [CouncilMemberSnapshot] })
    councilMembers: CouncilMemberSnapshot[]

    @Prop()
    councilName: string // VD: "Hội đồng CNPM 01"
}

@Schema({ _id: false })
class TopicStats {
    @Prop({ default: 0 }) views: number // Số lượt xem
    @Prop({ default: 0 }) downloads: number // Số lượt tải
    @Prop({ default: 0 }) averageRating: number // Điểm đánh giá trung bình (4.5)
    @Prop({ default: 0 }) reviewCount: number // Tổng số đánh giá (12)
}

@Schema({ collection: 'topics', timestamps: true })
export class Topic extends BaseEntity {
    @Prop({ type: String, required: true })
    titleVN: string

    @Prop({ type: String, required: true })
    titleEng: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true, enum: TopicType })
    type: TopicType

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Major.name, required: true })
    majorId: string

    @Prop({ default: 1 })
    maxStudents: number

    @Prop({ type: [String], default: [] })
    referenceDocs: string[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    createBy: User

    @Prop({ type: String, enum: TopicStatus, required: false, default: TopicStatus.Draft })
    currentStatus: string

    @Prop({ type: String, enum: PeriodPhaseName, required: true })
    currentPhase: string

    @Prop({ type: [PhaseHistory], default: [] })
    phaseHistories: PhaseHistory[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: Period.name })
    periodId: Period | string

    @Prop({ type: Grade, default: {}, required: false })
    grade: Grade
    //đề tài liệu có cần được duyệt hay không
    @Prop({ type: Boolean, default: false })
    allowManualApproval: boolean
    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: Requirement.name }], default: [], index: true })
    requirementIds: Requirement[]

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: File.name }], default: [], index: true })
    fileIds: string[]

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: Field.name }], default: [], index: true })
    fieldIds: Field[]

    // Chỉ có dữ liệu khi status = 'ARCHIVED'
    @Prop({ type: DefenseResult, required: false })
    defenseResult: DefenseResult

    @Prop({ type: Boolean, default: false, index: true })
    isPublishedToLibrary: boolean

    // === NHÓM Thống kê (Cho Thu) ===
    @Prop({ type: TopicStats, default: () => ({}) })
    stats: TopicStats
}
export const TopicSchema = SchemaFactory.createForClass(Topic)
