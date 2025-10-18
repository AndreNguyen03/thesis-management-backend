import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'
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

    @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
    departmentId: Types.ObjectId
}
export const DepartmentsSchema = SchemaFactory.createForClass(Major)
