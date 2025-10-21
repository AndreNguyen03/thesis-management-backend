import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { IsEmpty, IsOptional, IsString } from 'class-validator'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class Requirement extends BaseEntity {
    @Prop({ type: String, required: true, trim: true })
    name: string

    @Prop({ type: String, required: true, trim: true, index: true, unique: true })
    slug: string

    @Prop({ type: String, default: '' })
    description?: string
}

export const RequirementSchema = SchemaFactory.createForClass(Requirement)
