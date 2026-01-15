import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ collection: 'concepts', timestamps: false })
export class Concept extends Document {
    @Prop({ required: true })
    key: string

    @Prop({ required: true })
    label: string

    @Prop({ type: [String], default: [] })
    aliases: string[]

    @Prop()
    description?: string

    @Prop({ type: [Number], default: [] })
    embedding?: number[]
}

export const ConceptSchema = SchemaFactory.createForClass(Concept)
