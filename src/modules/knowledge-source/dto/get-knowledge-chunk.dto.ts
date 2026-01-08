import { Expose } from 'class-transformer'

export class GetKnowledgeChunkDto {
    @Expose()
    text: string
    @Expose()
    source_id: string
    @Expose()
    source_type: string
    @Expose()
    original_id: number
    @Expose()
    score: number
}
