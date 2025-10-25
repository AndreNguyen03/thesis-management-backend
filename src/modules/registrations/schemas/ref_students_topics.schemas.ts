import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_students_topics', timestamps: true })
export class StudentRegisterTopic extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true })
    studentId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId
}

export const StudentRegisterTopicSchema = SchemaFactory.createForClass(StudentRegisterTopic)
StudentRegisterTopicSchema.index({ studentId: 1, topicId: 1 }, { unique: true })
