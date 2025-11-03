import { IsOptional } from 'class-validator'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'

export class UpdateKnowledgeSourceDto {
    @IsOptional()
    name: string
    @IsOptional()
    description: string
    @IsOptional()
    status: KnowledgeStatus
    @IsOptional()
    processing_status: ProcessingStatus | ProcessingStatus.PENDING
    @IsOptional()
    owner: string
    @IsOptional()
    last_processed_at: Date | null
    @IsOptional()
    plot_embedding_voyage_3_large: number[]
}
