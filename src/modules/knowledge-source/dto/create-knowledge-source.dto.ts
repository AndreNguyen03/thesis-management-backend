import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { IsNotEmpty, IsOptional } from 'class-validator'
import { SourceType } from '../enums/source_type.enum'

export class CreateKnowledgeSourceDto {
    @IsNotEmpty()
    name: string
    @IsOptional()
    description: string
    @IsNotEmpty()
    source_type: SourceType = SourceType.URL
    @IsNotEmpty()
    source_location: string // nếu là url thì là link, nếu là file thì là download_url trên minio
    @IsOptional()
    status: KnowledgeStatus // hỏi người dùng có cần kích hoạt Knowledge Source này ko
    @IsNotEmpty()
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    @IsOptional()
    last_processed_at: Date | null // mặc định là null, sau khi thêm rabbitmq thì vào đây
}
