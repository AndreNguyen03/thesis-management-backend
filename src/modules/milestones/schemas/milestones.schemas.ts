import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Task } from '../../todolists/schemas/task.schema'
import { Expose } from 'class-transformer'

export enum MilestoneType {
    STANDARD = 'STANDARD',
    STRICT = 'STRICT' // Bảo vệ cuối kỳ (Cần Hội đồng, chấm điểm, feedback chi tiết)
}

export enum MilestoneStatus {
    TODO = 'Todo',
    IN_PROGRESS = 'In Progress',
    PENDING_REVIEW = 'Pending Review', // Đã nộp, chờ giảng viên xem
    NEEDS_REVISION = 'Needs Revision',
    COMPLETED = 'Completed',
    OVERDUE = 'Overdue'
}
export class FileInfo {
    @Expose()
    @Prop({ default: '' })
    name: string
    @Expose()
    @Prop({ default: '' })
    url: string
    @Expose()
    @Prop({ default: '' })
    size: number
}

@Schema({ _id: false })
export class Submission {
    @Prop({ default: Date.now })
    date: Date

    @Prop({ type: [FileInfo] }) // Lưu file info
    files: FileInfo[]

    @Prop({ required: true, type: mongoose.Types.ObjectId, ref: 'User' })
    createdBy: string
}

@Schema({ timestamps: true, collection: 'milestones' })
export class Milestone extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true })
    groupId: string

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop({ required: true })
    dueDate: Date

    //phân loại milestones
    @Prop({
        type: String,
        enum: MilestoneType,
        default: MilestoneType.STANDARD
    })
    type: MilestoneType

    // --- CẢI TIẾN 2: Trạng thái chi tiết hơn ---
    @Prop({
        type: String,
        enum: MilestoneStatus,
        default: MilestoneStatus.TODO
    })
    status: MilestoneStatus

    @Prop({ type: Submission, default: null })
    submission: Submission

    @Prop({ type: [Submission], default: [] })
    submissionHistory: Submission[]

    @Prop({ default: null, type: mongoose.Types.ObjectId, ref: Task.name })
    taskIds: string[]
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone)
// Index phục vụ query lấy milestone trong khoảng thời gian
MilestoneSchema.index({ groupId: 1, dueDate: 1 })
