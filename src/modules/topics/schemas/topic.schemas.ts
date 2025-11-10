import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from '../enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema()
export class PhaseHistory extends BaseEntity {
    @Prop({ type: String, enum: PeriodPhaseName, required: true })
    phaseName: string
    @Prop({ type: String, enum: TopicStatus })
    status: string
    @Prop({ type: Date, required: true })
    timestamp: Date
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    actorId: string
    @Prop()
    notes: string
}

@Schema({ collection: 'topics', timestamps: true })
export class Topic extends BaseEntity {
    @Prop({ required: true, unique: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true, enum: TopicType })
    type: TopicType

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true })
    majorId: string

    @Prop({ default: 1 })
    maxStudents: number

    @Prop({ type: [String], default: [] })
    referenceDocs: string[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    createBy: string

    @Prop({ type: String, enum: TopicStatus, default: TopicStatus.Draft })
    currentStatus: TopicStatus

    @Prop({ type: String, enum: PeriodPhaseName, required: true })
    currentPhase: string

    @Prop({ type: [PhaseHistory], default: [] })
    phaseHistories: PhaseHistory[]
    
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Period' })
    periodId: string

    @Prop({ type: Boolean, default: false })
    allowManualApproval: boolean
}
export const TopicSchema = SchemaFactory.createForClass(Topic)
