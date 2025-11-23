import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { PeriodStatus } from '../enums/periods.enum'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import mongoose from 'mongoose'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { Faculty } from '../../faculties/schemas/faculty.schema'

@Schema({ timestamps: true })
export class PeriodPhase extends BaseEntity {
    @Prop({ required: true, type: String, enum: PeriodPhaseName })
    phase: PeriodPhaseName
    @Prop({ required: true, type: Date })
    startTime: Date
    @Prop({ required: true, type: Date })
    endTime: Date
    //Option fields for Submit Topic phase
    @Prop({ default: 0, type: Number, required: false })
    minTopicsPerLecturer: number
    @Prop({ required: false, type: [mongoose.Schema.Types.ObjectId], ref: Lecturer.name })
    requiredLecturerIds: string[]
    @Prop({ default: false, required: false })
    allowManualApproval: boolean
}

@Schema({ collection: 'periods', timestamps: true })
export class Period extends BaseEntity {
    @Prop({ required: true })
    name: string
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Faculty.name })
    facultyId: mongoose.Schema.Types.ObjectId
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
}
export const PeriodSchema = SchemaFactory.createForClass(Period)
