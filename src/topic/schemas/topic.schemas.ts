import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { Types } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { TopicStatus } from '../enum'

export class SavedUserRef {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: Date, default: Date.now })
    savedAt: Date
}

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'Topic', timestamps: true })
export class Topic extends BaseEntity {
    @Prop({ required: true, unique: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true })
    type: 'Đồ án' | 'Khóa luận' | 'NCKH'

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Registration',
        default: []
    })
    registrationIds?: Types.ObjectId[]

    @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
    departmentId: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'Major', required: true })
    majorId: Types.ObjectId

    @Prop({ required: true, default: [] })
    field: string[]

    @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
    coAdvisorIds?: Types.ObjectId[]

    @Prop()
    maxStudents: number

    @Prop()
    deadline: Date

    @Prop({ enum: TopicStatus, default: TopicStatus.DRAFT })
    status: TopicStatus
}
export const TopicSchema = SchemaFactory.createForClass(Topic)
