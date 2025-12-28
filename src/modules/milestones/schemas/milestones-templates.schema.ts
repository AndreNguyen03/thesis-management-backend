import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { Period } from '../../periods/schemas/period.schemas'

@Schema({ _id: false })
export class DefenseCouncilMember {
    @Prop({ type: String, required: true })
    memberId: string

    @Prop({ type: String, required: true })
    role: string

    @Prop({ type: String, required: true })
    title: string

    @Prop({ type: String, required: true })
    fullName: string
}

@Schema({ _id: false })
export class TopicSnapshot {
    @Prop({ type: String, required: true })
    _id: string
    @Prop({ type: String, required: true })
    titleVN: string
    @Prop({ type: String, required: true })
    titleEng: string
    @Prop({ type: [String], required: true })
    studentName: string[]
}

@Schema({ collection: 'milestones_templates', timestamps: true })
export class MilestoneTemplate {
    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true })
    dueDate: Date

    @Prop({ required: true })
    type: string

    @Prop({ type: [DefenseCouncilMember], default: [] })
    defenseCouncil: DefenseCouncilMember[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Period.name, default: null })
    periodId: string

    @Prop({ type: [TopicSnapshot], default: [] })
    topicSnaps: TopicSnapshot[]

    @Prop({ type: [String], required: false })
    location: string
}

export const MilestoneTemplateSchema = SchemaFactory.createForClass(MilestoneTemplate)
