import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from '../enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { Major } from '../../majors/schemas/majors.schemas'
import { User } from '../../../users/schemas/users.schema'
import { Period } from '../../periods/schemas/period.schemas'
import { Requirement } from '../../requirements/schemas/requirement.schemas'
import { File } from '../../upload-files/schemas/upload-files.schemas'
import { Field } from '../../fields/schemas/fields.schemas'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ _id: false })
class CouncilMemberSnapshot {
    @Prop({ required: true }) fullName: string
    @Prop({ required: true }) role: string // "Chủ tịch", "Thư ký"...
    @Prop({ type: Number, required: false })
    score: number
    @Prop({ type: String, required: false })
    note: string
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

    @Prop({ type: Boolean, default: false })
    isPublished: boolean
}
@Schema({ _id: false })
class TopicStats {
    @Prop({ default: 0 }) views: number // Số lượt xem
    @Prop({ default: 0 }) downloads: number // Số lượt tải
    @Prop({ default: 0 }) averageRating: number // Điểm đánh giá trung bình (4.5)
    @Prop({ default: 0 }) reviewCount: number // Tổng số đánh giá (12)
}

@Schema({ timestamps: true })
export class PhaseHistory extends BaseEntity {
    @Prop({ type: String, enum: PeriodPhaseName, required: true })
    phaseName: string
    @Prop({ type: String, enum: TopicStatus, default: TopicStatus.Draft })
    status: string
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true, default: null })
    actor: string
    @Prop({ type: String, required: false })
    note: string
}
@Schema({ _id: false })
class FileSnapshot {
    // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: File.name, required: true })
    // fileId: string // Reference gốc để quản lý xóa/sửa

    @Prop({ required: true })
    fileName: string // VD: "Bao_cao_final_v2.pdf"

    @Prop({ required: true })
    fileUrl: string // URL từ S3/MinIO/Local để download trực tiếp

    @Prop()
    size: number // Kích thước file (bytes) - để hiện UI (VD: 5MB)

    // Quyền truy cập tài liệu này
    @Prop({ type: String, enum: ['public', 'internal', 'private'], default: 'internal' })
    accessLevel: string
}

// 2. Định nghĩa Sản phẩm cuối cùng (Artifacts)
@Schema({ _id: false })
class FinalProduct {
    // Tài liệu báo cáo (Khóa luận văn) - Bắt buộc phải có khi lưu kho
    @Prop({ type: [FileSnapshot], required: true })
    thesisReport: FileSnapshot[]

    // // Source code (Có thể là Link Git hoặc File Zip)
    // @Prop({ type: String })
    // sourceCodeUrl: string // Link GitHub/GitLab (Ưu tiên link repo cho ngành IT)

    // @Prop({ type: [FileSnapshot] })
    // sourceCodeZip: [FileSnapshot] // Hoặc file Zip backup nếu trường yêu cầu đóng gói
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

    // @Prop({ type: [String], default: [] })
    // referenceDocs: string[]

    //Sinh viên nộp báo cáo cuois cùng về cho khoa - cuối pha execution
    @Prop({ type: FinalProduct, default: null })
    finalProduct: FinalProduct

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

    // @Prop({ type: DefenseResult, default: {}, required: false })
    // defenseResult: DefenseResult
    //đề tài liệu có cần được duyệt hay không
    @Prop({ type: Boolean, default: false })
    allowManualApproval: boolean

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: Requirement.name }], default: [], index: true })
    requirementIds: Requirement[]

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: File.name }], default: [], index: true })
    fileIds: string[]

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: Field.name }], default: [], index: true })
    fieldIds: Field[]

    //Hội đồng
    @Prop({ type: DefenseResult, required: false })
    defenseResult: DefenseResult

    @Prop({ type: Boolean, default: false, index: true })
    isPublishedToLibrary: boolean

    // Admin-controlled soft-hide flag: when true topic stays in DB but hidden from regular users
    @Prop({ type: Boolean, default: false, index: true })
    isHiddenInLibrary: boolean

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: false, default: null })
    hiddenByAdmin: string | null

    @Prop({ type: Date, required: false, default: null })
    hiddenAt: Date | null

    @Prop({ type: TopicStats, default: { views: 0, downloads: 0, averageRating: 0, reviewCount: 0 } })
    stats: TopicStats
}
export const TopicSchema = SchemaFactory.createForClass(Topic)
// Index to speed up library visibility queries
TopicSchema.index({ isPublishedToLibrary: 1, isHiddenInLibrary: 1 })
