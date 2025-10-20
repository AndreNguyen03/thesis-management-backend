import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from 'aws-sdk/clients/directoryservice'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'topics', timestamps: true })
export class Topic extends BaseEntity {
    @Prop({ required: true })
    tittle: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true, enum: TopicType })
    type: TopicType

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true })
    majorId: string

    @Prop({ default: 1 })
    maxStudents: number

    @Prop({ type: Date })
    deadline: Date

    @Prop({ type: [String], default: [] })
    referenceDocs: string[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    createBy: string

    @Prop({ type: String, required: true })
    status: TopicStatus

    @Prop({ default: 0 })
    registeredStudents: number
}
export const TopicSchema = SchemaFactory.createForClass(Topic)
