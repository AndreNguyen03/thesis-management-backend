import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { PeriodStatus, PeriodType } from '../enums/periods.enum'
import { PeriodPhaseName, PeriodPhaseStatus } from '../enums/period-phases.enum'
import mongoose from 'mongoose'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { Faculty } from '../../faculties/schemas/faculty.schema'
import { User } from '../../../users/schemas/users.schema'

@Schema({ timestamps: true })
export class PeriodPhase extends BaseEntity {
    @Prop({ required: true, type: String, enum: PeriodPhaseName })
    phase: PeriodPhaseName
    @Prop({ required: false, type: Date })
    startTime: Date
    @Prop({ required: false, type: Date })
    endTime: Date
    //Option fields for Submit Topic phase
    @Prop({ type: Number, enum: PeriodPhaseStatus, required: false })
    status: string
    @Prop({ type: Number, required: false })
    minTopicsPerLecturer: number
    @Prop({ required: false, ref: User.name, type: [mongoose.Schema.Types.ObjectId] })
    requiredLecturerIds: string[]
    @Prop({ required: false })
    allowManualApproval: boolean
}

@Schema({ collection: 'periods', timestamps: true })
export class Period extends BaseEntity {
    @Prop({ required: true })
    year: string
    @Prop({ required: true })
    semester: number
    @Prop({ required: true, type: String, enum: PeriodType })
    type: string
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Faculty.name })
    faculty: Faculty
    @Prop({ enum: PeriodPhaseName, type: String, default: PeriodPhaseName.EMPTY })
    currentPhase: string
    @Prop({ type: [PeriodPhase], default: [] })
    phases: PeriodPhase[]
    @Prop({ enum: PeriodStatus, default: PeriodStatus.OnGoing })
    status: PeriodStatus
    // @Prop({ required: true, type: Number })
    // totalTopics: number
    @Prop({ required: true, type: Date })
    startTime: Date
    @Prop({ required: true, type: Date })
    endTime: Date
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Lecturer.name })
    actorId: string
}
export const PeriodSchema = SchemaFactory.createForClass(Period)
