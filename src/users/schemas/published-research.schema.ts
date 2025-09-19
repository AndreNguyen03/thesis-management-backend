import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class PublishedResearch {
    @Prop({ required: true })
    title: string

    @Prop()
    journal?: string

    @Prop()
    conference?: string

    @Prop({ type: Number, required: true })
    year: number

    @Prop()
    link?: string
}

export const PublishedResearchSchema = SchemaFactory.createForClass(PublishedResearch)
