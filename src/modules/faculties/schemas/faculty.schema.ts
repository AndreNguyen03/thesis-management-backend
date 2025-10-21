import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class Faculty extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string
    @Prop({ type: String, required: true })
    email: string
    @Prop({ type: String, required: true })
    urlDirection: string
}

export const FacultySchema = SchemaFactory.createForClass(Faculty)
