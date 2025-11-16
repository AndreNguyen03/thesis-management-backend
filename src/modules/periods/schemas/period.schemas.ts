import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { PeriodStatus } from '../enums/periods.enum'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import mongoose from 'mongoose'

@Schema({ timestamps: true })
export class PeriodPhase extends BaseEntity {
    @Prop({ required: true, enum: PeriodPhaseName })
    phase: PeriodPhaseName
    @Prop({ required: true, type: Date })
    startTime: Date
    @Prop({ required: true, type: Date })
    endTime: Date
    //Option fields for Submit Topic phase
    @Prop({ default: 0, type: Number, required: false })
    minTopicsPerLecturer: number
    @Prop({ required: false, type: [mongoose.Schema.Types.ObjectId], ref: 'lecturers' })
    requiredLecturerIds: string[]
    @Prop({ default: false, required: false })
    allowManualApproval: boolean
}

@Schema({ collection: 'periods', timestamps: true })
export class Period extends BaseEntity {
    @Prop({ required: true })
    name: string
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'faculties' })
    facultyId: mongoose.Schema.Types.ObjectId
    @Prop({ enum: PeriodPhaseName, type: String, default: PeriodPhaseName.EMPTY })
    currentPhase: string
    @Prop({ type: [PeriodPhase], default: [] })
    phases: PeriodPhase[]
    @Prop({ enum: PeriodStatus, default: PeriodStatus.OnGoing })
    status: PeriodStatus
    @Prop({ required: true, type: Number })
    totalTopics: number
    @Prop({ required: true, type: Date })
    startTime: Date
    @Prop({ required: true, type: Date })
    endTime: Date
}
export const PeriodSchema = SchemaFactory.createForClass(Period)
