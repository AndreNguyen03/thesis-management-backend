// knowledge-chunk.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'knowledge_chunks' })
export class KnowledgeChunk extends BaseEntity {
    // Liên kết chunk tới tài liệu gốc
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeSource' })
    source_id: string
    @Prop({ required: true })
    text: string
    @Prop({ required: true, type: [Number] })
    plot_embedding_gemini_large: number[] // Đổi tên cho tổng quát
}

export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk)
