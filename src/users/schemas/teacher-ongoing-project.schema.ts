import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'

@Schema({ _id: false })
export class TeacherOngoingProject {
    @Prop({ type: Types.ObjectId })
    projectId: Types.ObjectId // tham chiếu tới Project

    @Prop({ required: true })
    title: string

    @Prop()
    field: string

    @Prop({ type: Number })
    year?: number

    @Prop()
    startDate?: string
}

export const TeacherOngoingProjectSchema = SchemaFactory.createForClass(TeacherOngoingProject)
