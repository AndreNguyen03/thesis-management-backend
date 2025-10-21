import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_fields_topics', timestamps: true })
export class RefFieldTopics extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true })
    fieldId: mongoose.Schema.Types.ObjectId
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId
}
export const RefFieldTopicSchema = SchemaFactory.createForClass(RefFieldTopics)
        