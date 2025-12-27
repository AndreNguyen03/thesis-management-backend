import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Task } from '../../todolists/schemas/task.schema'
import { Expose } from 'class-transformer'
import { User } from '../../../users/schemas/users.schema'
import { Group } from '../../groups/schemas/groups.schemas'
import { Period } from '../../periods/schemas/period.schemas'
import { LecturerReviewDecision } from '../enums/lecturer-decision.enum'

export enum MilestoneCreator {
    LECTURER = 'lecturer', // Giảng viên tạo riêng cho nhóm
    FACULTY = 'faculty_board' // Ban chủ nhiệm/Khoa tạo chung
}

export enum MilestoneStatus {
    TODO = 'Todo',
    IN_PROGRESS = 'In Progress',
    PENDING_REVIEW = 'Pending Review', // Đã nộp, chờ giảng viên xem
    NEEDS_REVISION = 'Needs Revision',
    COMPLETED = 'Completed'
}

export enum MilestoneType {
    SUBMISSION = 'submission',
    DEFENSE = 'defense'
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

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    createdBy: string

    @Prop({ default: '' })
    lecturerFeedback: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    lecturerId: string

    @Prop({ type: Date })
    feedbackAt: Date

    @Prop({ type: String, enum: LecturerReviewDecision })
    decision: LecturerReviewDecision
}

@Schema({ _id: false })
export class DefenseCouncilMember {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    memberId: string
    @Prop({ type: String, required: true })
    role: string
    @Prop({ type: String, required: true })
    title: string
    @Prop({ type: String, required: true })
    fullName: string
}

@Schema({ timestamps: true, collection: 'milestones' })
export class Milestone extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Group.name, required: true, index: true })
    groupId: string

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop({ required: true })
    dueDate: Date

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

    @Prop({ default: null, type: mongoose.Schema.Types.ObjectId, ref: Task.name })
    taskIds: string[]

    @Prop({ default: null, type: mongoose.Schema.Types.ObjectId, ref: User.name })
    createdBy: string

    @Prop({ enum: MilestoneCreator, default: MilestoneCreator.LECTURER })
    creatorType: MilestoneCreator

    @Prop({ default: null, type: String })
    refId: string

    @Prop({ default: true, type: Boolean })
    isActive: boolean

    @Prop({ default: MilestoneType.SUBMISSION, enum: MilestoneType })
    type: MilestoneType

    @Prop({ type: [DefenseCouncilMember], default: [] , required: false})
    defenseCouncil: DefenseCouncilMember[]

    @Prop({ type: String, required: false })
    room: string
    @Prop({ type: [mongoose.], required: false })
    topicDefenses: []
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone)
// Index phục vụ query lấy milestone trong khoảng thời gian
MilestoneSchema.index({ groupId: 1, dueDate: 1 })
