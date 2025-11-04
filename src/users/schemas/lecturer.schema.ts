import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Types } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { Topic } from '../../modules/topics/schemas/topic.schemas'
import { User } from './users.schema'
import { AcademicTitle } from '../enums/academic-title'

export class Publication {
    @Prop({ default: '' })
    title: string

    @Prop({ default: '' })
    journal: string

    @Prop({ default: '' })
    conference: string

    @Prop({ default: '' })
    link?: string

    @Prop({ default: '' })
    year: string

    @Prop({ default: '' })
    type: string

    @Prop({ default: 0 })
    citations: number
}

export type LecturerDocument = HydratedDocument<Lecturer>

@Schema({ collection: 'lecturers', timestamps: true })
export class Lecturer extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId

    @Prop({ required: true, enum: AcademicTitle, default: AcademicTitle.Master })
    title: AcademicTitle

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' })
    facultyId: Types.ObjectId

    @Prop({ type: [String], default: [] })
    areaInterest: string[]

    @Prop({ type: [String], default: [] })
    researchInterests: string[]

    @Prop({ type: [Publication], default: [] })
    publications: Publication[]

    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Topic', default: [] })
    supervisedThesisIds: Types.ObjectId[]
}

export const LecturerSchema = SchemaFactory.createForClass(Lecturer)
