import { SourceType } from 'aws-sdk/clients/codebuild'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { IsEmpty, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateKnowledgeSourceDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    source_type: SourceType
    @IsNotEmpty()
    source_location: string
    @IsNotEmpty()
    status: KnowledgeStatus
    @IsOptional()
    processing_status: ProcessingStatus | ProcessingStatus.PENDING
    @IsNotEmpty()
    owner: string
    @IsOptional()
    last_processed_at: Date | null
}
