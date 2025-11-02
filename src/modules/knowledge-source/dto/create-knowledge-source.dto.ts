import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { IsEmpty, IsNotEmpty, IsOptional } from 'class-validator'
import { SourceType } from '../enums/source_type.enum'

export class CreateKnowledgeSourceDto {
    @IsNotEmpty()
    name: string
    @IsOptional()
    description: string
    @IsNotEmpty()
    source_type: SourceType
    @IsNotEmpty()
    source_location: string
    @IsOptional()
    status: KnowledgeStatus
    @IsOptional()
    processing_status: ProcessingStatus
    @IsOptional()
    last_processed_at: Date | null // mặc định là null, sau khi thêm rabbitmq thì vào đây
}
