import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

// schemas/milestone.schema.ts
@Schema({ timestamps: true, collection: 'milestones' })
export class Milestone {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true })
    topicId: string

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop({ required: true })
    startDate: Date

    @Prop({ required: true })
    endDate: Date

    @Prop({ enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending' })
    status: string

    @Prop({ default: '#3498db' }) // Màu hiển thị trên UI
    color: string
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone)
// Index phục vụ query lấy milestone trong khoảng thời gian
MilestoneSchema.index({ topicId: 1, startDate: 1, endDate: 1 })
