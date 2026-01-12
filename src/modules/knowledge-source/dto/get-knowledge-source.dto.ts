import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { Expose, Transform, Type } from 'class-transformer'
import { SourceType } from '../enums/source_type.enum'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class OwnerDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    role: string
}

export class KnowledgeMetadataDto {
    @Expose()
    wordCount?: number

    @Expose()
    chunkCount?: number

    @Expose()
    fileSize?: number

    @Expose()
    mimeType?: string

    @Expose()
    progress?: number

    @Expose()
    errorMessage?: string
}

export class GetKnowledgeSourceDto {
    @Expose()
    _id: string

    @Expose()
    name: string

    // Alias for frontend compatibility (frontend expects 'title')
    @Expose({ name: 'title' })
    @Transform(({ obj }) => obj.name)
    title: string

    @Expose()
    description: string

    @Expose()
    source_type: SourceType

    // Alias for frontend compatibility (frontend expects 'type')
    @Expose({ name: 'type' })
    @Transform(({ obj }) => obj.source_type)
    type: SourceType

    @Expose()
    source_location: string

    // Alias for frontend compatibility (frontend expects 'url')
    @Expose({ name: 'url' })
    @Transform(({ obj }) => obj.source_location)
    url: string

    @Expose()
    status: KnowledgeStatus

    @Expose()
    processing_status: ProcessingStatus

    @Expose()
    @Type(() => OwnerDto)
    owner_info: OwnerDto

    @Expose()
    last_processed_at: Date

    @Expose()
    @Type(() => KnowledgeMetadataDto)
    metadata?: KnowledgeMetadataDto

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date
}

export class GetPaginatedKnowledgeSourcesDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetKnowledgeSourceDto)
    data: GetKnowledgeSourceDto[]
}
