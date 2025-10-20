import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class RefRequirementTopics extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true })
    requirementId: mongoose.Schema.Types.ObjectId
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId
}
export const RefRequirementTopicSchema = SchemaFactory.createForClass(RefRequirementTopics)
