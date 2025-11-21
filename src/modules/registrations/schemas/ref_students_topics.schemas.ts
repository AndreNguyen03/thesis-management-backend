import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { StudentRegistrationStatus } from '../enum/student-registration-status.enum'
import { Topic } from '../../topics/schemas/topic.schemas'
import { User } from '../../../users/schemas/users.schema'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'ref_students_topics', timestamps: true })
export class StudentRegisterTopic extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    userId: User

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Topic.name, required: true })
    topicId: Topic

    @Prop({ type: String, required: true, enum: StudentRegistrationStatus, default: StudentRegistrationStatus.PENDING })
    status: StudentRegistrationStatus
}

export const StudentRegisterTopicSchema = SchemaFactory.createForClass(StudentRegisterTopic)


    