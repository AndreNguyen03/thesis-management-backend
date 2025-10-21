import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'majors', timestamps: true })
export class Major extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string

    @Prop({ type: mongoose.Schema.Types.String, ref: 'Faculty', required: true })
    facultyId: string
}

export const MajorSchema = SchemaFactory.createForClass(Major)
