import { SourceType } from '../enums/source_type.enum'

export class CreateKnowledgeChunkDto {
    source_id: string
    source_type: SourceType
    text: string
    plot_embedding_gemini_large: number[]
}
