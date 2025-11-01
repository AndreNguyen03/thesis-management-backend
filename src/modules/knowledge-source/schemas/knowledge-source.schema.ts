import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { SourceType } from '../enums/source_type.enum'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'knowledge_sources' })
export class KnowledgeSource extends BaseEntity {
    @Prop({ required: true })
    name: string
    @Prop({ required: true })
    description: string
    @Prop({ required: true, enum: SourceType })
    source_type: SourceType
    @Prop({ required: true })
    source_location: string
    @Prop({ required: true, enum: KnowledgeStatus })
    status: KnowledgeStatus
    @Prop({ required: true, enum: ProcessingStatus })
    processing_status: ProcessingStatus

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    owner: string
    @Prop({ required: false, default: null })
    last_processed_at: Date

    @Prop({ required: false, type: [Number], default: [] })
    plot_embedding_voyage_3_large: number[]
}
export const KnowledgeSourceSchema = SchemaFactory.createForClass(KnowledgeSource)
