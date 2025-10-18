import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
class Field extends BaseEntity {
    @Prop({ required: true, unique: true, trim: true })
    name: string

    @Prop({ default: '', trim: true })
    description?: string
}

export const FieldSchema = SchemaFactory.createForClass(Field)
