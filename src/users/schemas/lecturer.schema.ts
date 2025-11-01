import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { Topic } from '../../topic/schemas/topic.schemas'

export class Education {
    @Prop({ default: '' })
    degree: string

    @Prop({ default: '' })
    university: string

    @Prop({ default: '' })
    year: string

    @Prop({ default: '' })
    specialization: string
}

export class Publication {
    @Prop({ default: '' })
    title: string

    @Prop({ default: '' })
    journal: string

    @Prop({ default: '' })
    conference: string

    @Prop({ default: '' })
    year: string

    @Prop({ default: '' })
    type: string

    @Prop({ default: 0 })
    citations: number
}

export class Project {
    @Prop({ default: '' })
    title: string

    @Prop({ default: '' })
    duration: string

    @Prop({ default: '' })
    funding: string

    @Prop({ default: '' })
    role: string

    @Prop({ default: '' })
    budget: string
}

// export class Thesis {
//     @Prop({ default: '' })
//     year: string

//     @Prop({ default: '' })
//     title: string

//     @Prop({ default: '' })
//     student: string

//     @Prop({ default: '' })
//     result: string

//     @Prop({ default: '' })
//     field: string
// }

// export class CurrentThesis {
//     @Prop({ default: '' })
//     title: string

//     @Prop({ default: '' })
//     field: string

//     @Prop({ default: 0 })
//     slotsLeft: number

//     @Prop({ default: 0 })
//     totalSlots: number

//     @Prop({ default: '' })
//     deadline: string

//     @Prop({ default: 0 })
//     difficulty: number
// }

export class ThesisStats {
    @Prop({ default: 0 })
    total: number

    @Prop({ default: 0 })
    completed: number

    @Prop({ default: 0 })
    ongoing: number

    @Prop({ default: 0 })
    excellent: number

    @Prop({ default: 0 })
    good: number

    @Prop({ default: 0 })
    average: number

    @Prop({ default: 0 })
    successRate: number
}

export type LecturerDocument = HydratedDocument<Lecturer>

@Schema({ collection: 'lecturers', timestamps: true })
export class Lecturer extends BaseEntity {
    @Prop({ required: true, default: '' })
    email: string

    @Prop({ required: true, default: '' })
    fullName: string

    @Prop({ required: true, default: 'lecturer' })
    role: 'lecturer'

    @Prop({ required: true, default: '' })
    password_hash: string

    @Prop({ default: '' })
    phone: string

    @Prop({ default: true })
    isActive: boolean

    @Prop({ default: '' })
    avatarUrl: string

    @Prop({ default: '' })
    avatarName: string

    @Prop({ required: true, default: '' })
    position: string

    @Prop({ required: true, default: '' })
    department: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true, default: '' })
    faculty: mongoose.Schema.Types.ObjectId

    @Prop({ required: true, default: '' })
    university: string

    @Prop({ default: '' })
    office: string

    @Prop({ type: [String], default: [] })
    expertise: string[]

    @Prop({ type: [String], default: [] })
    researchInterests: string[]

    @Prop({ default: '' })
    bio: string

    @Prop({ type: [Education], default: [] })
    education: Education[]

    @Prop({ type: [Publication], default: [] })
    publications: Publication[]

    @Prop({ type: [Project], default: [] })
    projects: Project[]

    @Prop({ type: [String], ref: 'Thesis', default: [] })
    supervisedThesisIds: string[]
    // @Prop({ type: ThesisStats, default: () => ({}) })
    // thesisStats: ThesisStats

    // @Prop({ type: [Thesis], default: [] })
    // completedThesis: Thesis[]

    // @Prop({ type: [CurrentThesis], default: [] })
    // currentThesis: CurrentThesis[]
}

export const LecturerSchema = SchemaFactory.createForClass(Lecturer)
