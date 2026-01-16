import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ collection: 'concepts', timestamps: false })
export class Concept extends Document {
    @Prop({ required: true, unique: true, index: true })
    key: string

    @Prop({ required: true })
    label: string

    @Prop({ type: [String], default: [] })
    aliases: string[]

    @Prop({ type: Number, default: 0 })
    depth: number

    @Prop({ type: [Number], default: [] })
    embedding?: number[]
}

export const ConceptSchema = SchemaFactory.createForClass(Concept)

// Ensure unique index on key
ConceptSchema.index({ key: 1 }, { unique: true })
