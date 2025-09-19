import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'

@Schema({ _id: false })
export class TeacherCompletedProject {
    @Prop({ type: Types.ObjectId, required: true })
    projectId: Types.ObjectId // tham chiếu tới Project

    @Prop({ required: true })
    title: string

    @Prop()
    field: string

    @Prop({ type: Number })
    year?: number
}

export const TeacherCompletedProjectSchema = SchemaFactory.createForClass(TeacherCompletedProject)
