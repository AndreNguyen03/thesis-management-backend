import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'facultys', timestamps: true })
export class Faculty extends BaseEntity {
    @Prop({ required: true, unique: true })
    name: string

    @Prop({ required: true, unique: true })
    email: string

    @Prop({ required: true, unique: true })
    url: string
}
export const FacultysSchema = SchemaFactory.createForClass(Faculty)
