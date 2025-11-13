import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { PeriodStatus } from '../enums/periods.enum'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import mongoose from 'mongoose'

@Schema({ timestamps: true })
export class PeriodPhases extends BaseEntity {
    @Prop({ required: true, enum: PeriodPhaseName })
    phase: PeriodPhaseName
    @Prop({ required: true })
    startTime: Date
    @Prop({ required: true })
    endTime: Date
    @Prop({ default: 0, type: Number })
    minTopicsPerLecturer: number
    @Prop({ required: true, type: [mongoose.Schema.Types.ObjectId], ref: 'lecturers' })
    requiredLecturerIds: mongoose.Schema.Types.ObjectId[]
    @Prop({ default: false })
    allowManualApproval: boolean
}

@Schema({ collection: 'periods', timestamps: true })
export class Period extends BaseEntity {
    @Prop({ required: true })
    name: string
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'faculties' })
    facultyId: mongoose.Schema.Types.ObjectId
    @Prop({ type: [PeriodPhases], default: [] })
    phases: PeriodPhases[]
    @Prop({ enum: PeriodStatus, default: PeriodStatus.OnGoing })
    status: PeriodStatus
}
export const PeriodSchema = SchemaFactory.createForClass(Period)
