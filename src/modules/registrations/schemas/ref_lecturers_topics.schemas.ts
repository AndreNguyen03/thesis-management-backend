import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_lecturers_topics', timestamps: true })
export class LecturerRegisterTopic extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true })
    lecturerId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId
}

export const LecturerRegisterTopicSchema = SchemaFactory.createForClass(LecturerRegisterTopic)
LecturerRegisterTopicSchema.index({ lecturerId: 1, topicId: 1 }, { unique: true })
