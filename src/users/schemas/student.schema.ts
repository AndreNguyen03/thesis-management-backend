import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema()
export class StudentProject {
    @Prop({ default: '' })
    title: string

    @Prop({ default: '' })
    description: string

    @Prop({ type: [String], default: [] })
    technologies: string[]
}

export type StudentDocument = HydratedDocument<Student>

@Schema({ collection: 'students', timestamps: true })
export class Student extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ required: true, default: '' })
    studentCode: string

    @Prop({ required: true, default: '' })
    class: string

    @Prop({ required: true, default: '' })
    major: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Faculty' })
    facultyId: mongoose.Schema.Types.ObjectId

    @Prop({ default: [] })
    skills: string[]

    @Prop({ default: [] })
    interests: string[]
}

export const StudentSchema = SchemaFactory.createForClass(Student)
