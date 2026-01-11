import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { IsNotEmpty, IsString } from 'class-validator'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'fields', timestamps: true })
export class Field extends BaseEntity {
    @Prop({ required: true, type: String })
    name: string

    @Prop({ required: true, type: String })
    slug: string

    @Prop({ required: false, type: String, default: '' })
    description: string
}
export const FieldSchema = SchemaFactory.createForClass(Field)
