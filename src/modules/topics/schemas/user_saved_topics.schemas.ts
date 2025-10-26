import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({ collection: 'user_saved_topics', timestamps: true })
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'user_saved_topics', timestamps: true })
export class UserSavedTopics extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId
}
export const UserSavedTopicsSchema = SchemaFactory.createForClass(UserSavedTopics)
