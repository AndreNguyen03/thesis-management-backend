// knowledge-chunk.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { SourceType } from '../enums/source_type.enum'

@Schema({
    collection: 'knowledge_chunks',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class KnowledgeChunk extends BaseEntity {
    // Liên kết chunk tới tài liệu gốc
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeSource', index: true })
    source_id: string

    // Lưu trực tiếp source_type để filter nhanh trong vector search
    @Prop({ required: true, enum: SourceType, index: true })
    source_type: SourceType

    @Prop({ required: true })
    text: string

    @Prop({ required: true, type: [Number] })
    plot_embedding_gemini_large: number[] // Đổi tên cho tổng quát

    @Prop({ default: Date.now })
    created_at: Date
}

export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk)
