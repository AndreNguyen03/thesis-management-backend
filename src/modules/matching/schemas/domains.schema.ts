import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ timestamps: true })
export class Domain {
    @Prop({ type: String, required: true, unique: true })
    code: string
    @Prop({ type: String, required: true })
    name: string
    @Prop({ type: String, required: false, default: '' })
    description?: string
    @Prop({ type: Boolean, required: true, default: true })
    isActive: boolean
}

export const DomainSchema = SchemaFactory.createForClass(Domain)
