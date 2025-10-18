import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'departments', timestamps: true })
export class Department extends BaseEntity {
    @Prop({ required: true, unique: true })
    name: string

    @Prop({ required: true, unique: true })
    email: string

    @Prop({ required: true, unique: true })
    url: string
}
export const DepartmentsSchema = SchemaFactory.createForClass(Department)
