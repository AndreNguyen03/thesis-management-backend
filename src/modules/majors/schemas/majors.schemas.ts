import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { Faculty } from '../../faculties/schemas/faculty.schema'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'majors', timestamps: true })
export class Major extends BaseEntity {
    @Prop({ type: String, required: true, unique: true })
    name: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Faculty.name, required: true })
    facultyId: mongoose.Types.ObjectId
}

export const MajorSchema = SchemaFactory.createForClass(Major)
