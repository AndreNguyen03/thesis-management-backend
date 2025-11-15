import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { LecturerRoleEnum } from '../enum/lecturer-role.enum'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_lecturers_topics', timestamps: true })
export class LecturerRegisterTopic extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true })
    topicId: mongoose.Schema.Types.ObjectId

    @Prop({ type: String, enum: LecturerRoleEnum, default: LecturerRoleEnum.CO_SUPERVISOR })
    role: string
}

export const LecturerRegisterTopicSchema = SchemaFactory.createForClass(LecturerRegisterTopic)
