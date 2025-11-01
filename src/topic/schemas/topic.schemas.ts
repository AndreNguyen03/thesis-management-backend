import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Types } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { TopicStatus } from '../enum'

export type TopicDocument = HydratedDocument<Topic>

export class SavedUserRef {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: Date, default: Date.now })
    savedAt: Date
}

@Schema({
    collection: 'topics',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class Topic extends BaseEntity {
    @Prop({ required: true, unique: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true, enum: ['Đồ án', 'Khóa luận', 'NCKH'] })
    type: 'Đồ án' | 'Khóa luận' | 'NCKH'

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Registration',
        default: []
    })
    registrationIds?: mongoose.Schema.Types.ObjectId[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true })
    departmentId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true })
    majorId: Types.ObjectId

    @Prop({ type: [String], default: [] })
    field?: string[]

    @Prop({ type: [String], ref: 'Student', default: [] })
    studentIds?: string[]

    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'File', default: [] })
    fileIds?: mongoose.Schema.Types.ObjectId[]

    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
    coAdvisorIds?: mongoose.Schema.Types.ObjectId[]

    @Prop({ type: Number, default: 0 })
    maxStudents: number

    @Prop({ type: Number, default: 0 })
    registeredStudents: number

    @Prop({ type: Date })
    deadline: Date

    @Prop({ type: [{ name: String, url: String }], default: [] })
    references?: { name: string; url: string }[]

    @Prop({ enum: TopicStatus, default: TopicStatus.DRAFT })
    status: TopicStatus

    @Prop({ type: [SavedUserRef], default: [] })
    savedBy?: SavedUserRef[]
}

export const TopicSchema = SchemaFactory.createForClass(Topic)
