import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
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
    @Prop({ required: true, default: '' })
    fullName: string

    @Prop({ required: true, default: '' })
    class: string

    @Prop({ required: true, default: '' })
    major: string

    @Prop({ required: true, default: '' })
    email: string

    @Prop({ default: '' })
    phone: string

    @Prop({ required: true, default: '' })
    password_hash: string

    @Prop({ required: true, default: 'student' })
    role: 'student'

    @Prop({ default: '' })
    avatarUrl: string

    @Prop({ default: '' })
    avatarName: string

    @Prop({ default: true })
    isActive: boolean

    @Prop({ default: '' })
    bio: string

    @Prop({ type: [String], default: [] })
    skills: string[]

    @Prop({ type: [String], default: [] })
    interests: string[]

    @Prop({ type: String, default: '' })
    studentCode: string

    @Prop({ type: String, default: '' })
    faculty: string
}

export const StudentSchema = SchemaFactory.createForClass(Student)
