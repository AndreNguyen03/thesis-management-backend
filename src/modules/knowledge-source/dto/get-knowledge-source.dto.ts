import { SourceType } from 'aws-sdk/clients/codebuild'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'
import { Expose, Transform, Type } from 'class-transformer'
import { GetUserDetailsResponse } from 'aws-sdk/clients/codecatalyst'
import { LinkDto, MetaDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class OwnerDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    role: string
}
export class GetKnowledgeSourceDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    description: string
    @Expose()
    source_type: SourceType
    @Expose()
    source_location: string
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
    createdAt: Date
    @Expose()
    updatedAt: Date
}

export class GetPaginatedKnowledgeSourcesDto {
    @Expose()
    @Type(() => GetKnowledgeSourceDto)
    data: GetKnowledgeSourceDto[]
    @Expose()
    @Type(() => MetaDto)
    meta: MetaDto
    @Expose()
    @Type(() => LinkDto)
    links: LinkDto
}
