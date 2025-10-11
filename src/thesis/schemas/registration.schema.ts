import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { RegistrationStatus } from '../enum'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({ collection: 'registrations', timestamps: true })
export class Registration extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Thesis' })
    thesisId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'registrantModel' })
    registrantId: mongoose.Schema.Types.ObjectId

    @Prop({ type: String, required: true, enum: ['Student', 'Lecturer'] }) // Chỉ định các model có thể tham chiếu
    registrantModel: string

    @Prop({ enum: RegistrationStatus, default: RegistrationStatus.PENDING })
    status: RegistrationStatus

    @Prop()
    message?: string
}
export const RegistrationSchema = SchemaFactory.createForClass(Registration)
