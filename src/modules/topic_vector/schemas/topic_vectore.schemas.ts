import { Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({ collection: 'topic_vectors', timestamps: true })
export class TopicVector extends BaseEntity {}
export const TopicVectorSchema = SchemaFactory.createForClass(TopicVector)  