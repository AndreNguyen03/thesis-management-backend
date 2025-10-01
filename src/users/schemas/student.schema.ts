import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BaseEntity } from 'src/shared/base/entity/base.entity'

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
    avatar: string

    @Prop({ default: true })
    isActive: boolean

    @Prop({ default: '' })
    introduction: string

    @Prop({ type: [String], default: [] })
    skills: string[]

    @Prop({ type: [StudentProject], default: [] })
    projects: StudentProject[]

    @Prop({ type: [String], default: [] })
    subjects: string[]

    @Prop({ type: [String], default: [] })
    interests: string[]
}

export const StudentSchema = SchemaFactory.createForClass(Student)
