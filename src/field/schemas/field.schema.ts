import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class Field extends BaseEntity {
    @Prop({ required: true, unique: true, trim: true })
    name: string

    @Prop({ required: true , unique: true, trỉm: true})
    slug: string

    @Prop({ default: '', trim: true })
    description?: string
}

export const FieldSchema = SchemaFactory.createForClass(Field)
