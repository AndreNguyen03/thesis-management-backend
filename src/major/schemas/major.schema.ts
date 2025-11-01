import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { Types } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'majors', timestamps: true })
export class Major extends BaseEntity {
    @Prop({ required: true, unique: true })
    name: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true })
    departmentId: mongoose.Schema.Types.ObjectId
}
export const MajorSchema = SchemaFactory.createForClass(Major)
