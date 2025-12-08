import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { StudentRegistrationStatus } from '../enum/student-registration-status.enum'
import { Topic } from '../../topics/schemas/topic.schemas'
import { User } from '../../../users/schemas/users.schema'

export enum RejectionReasonType {
    FULL_SLOT = 'full_slot',
    GPA_LOW = 'gpa_low',
    SKILL_MISMATCH = 'skill_mismatch',
    OTHER = 'other'
}
//Vai trò cho sinh viên
export enum StudentTopicRole {
    LEADER = 'leader',
    MEMBER = 'member'
}

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_students_topics', timestamps: true })
export class StudentRegisterTopic extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    userId: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Topic.name, required: true })
    topicId: string

    @Prop({ type: String, required: true, enum: StudentRegistrationStatus, default: StudentRegistrationStatus.PENDING })
    status: StudentRegistrationStatus

    // Ghi chú nguyện vọng của SINH VIÊN khi mà nó đăng ký
    @Prop({ type: String, default: '', required: false })
    studentNote: string

    // Phản hồi của giảng viên (lý do từ chối hoặc lời chào mừng)
    @Prop({ type: String, default: '', required: false })
    lecturerResponse: string
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: false })
    processedBy: string

    @Prop({ type: String, enum: RejectionReasonType, required: false })
    rejectionReasonType: string

    @Prop({ type: String, enum: StudentTopicRole, default: StudentTopicRole.MEMBER, required: false })
    studentRole: string
}

export const StudentRegisterTopicSchema = SchemaFactory.createForClass(StudentRegisterTopic)
