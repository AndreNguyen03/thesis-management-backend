import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { Period } from '../../periods/schemas/period.schemas'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({ collection: 'milestones_templates', timestamps: true })
export class MilestoneTemplate extends BaseEntity {
    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true })
    dueDate: Date

    @Prop({ required: true })
    type: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Period.name, required: true })
    periodId: string

    @Prop({ type: Boolean, default: false })
    isPublished: boolean // Đã công bố điểm

    @Prop({ type: Boolean, default: false })
    isBlock: boolean // Đã khóa (không cho chỉnh sửa)

    @Prop({ type: mongoose.Schema.Types.ObjectId })
    createdBy: string
}

export const MilestoneTemplateSchema = SchemaFactory.createForClass(MilestoneTemplate)
