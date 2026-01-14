import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { Document, Types } from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

export type TopicInteractionDocument = TopicInteraction & Document

@Schema({ timestamps: true })
@Schema({ timestamps: true })
export class TopicInteraction extends BaseEntity {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  userId: string

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  topicId: string

  @Prop({
    type: String,
    enum: ['view', 'click', 'bookmark', 'register', 'download'],
    required: true,
    index: true
  })
  action: string
}


export const TopicInteractionSchema = SchemaFactory.createForClass(TopicInteraction)
    