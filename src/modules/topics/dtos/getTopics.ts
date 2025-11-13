import { Expose, Transform, Type } from 'class-transformer'
import { GetRegistrationInTopicDto } from '../../registrations/dtos/get-registration-in-topic.dtos'
import { IntersectionType } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { extend } from 'joi'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class GetTopicResponseDto {
    @Expose()
    _id: string

    @Expose()
    title: string

    @Expose()
    description: string

    @Expose()
    type: string

    @Expose()
    major: string

    @Expose()
    maxStudents: number

    @Expose()
    createBy: string

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date

    @Expose()
    currentStatus: string

    @Expose()
    currentPhase: string

    @Expose()
    fieldNames: string[]

    @Expose()
    requirementNames: string[]

    @Expose()
    studentNames: string[]

    @Expose()
    lecturerNames: string[]

    @Expose()
    isRegistered: boolean

    @Expose()
    isSaved: boolean
}

export class GetCancelRegisteredTopicResponseDto extends GetTopicResponseDto {
    @Expose()
    lastestCanceledRegisteredAt?: Date
}

export class GetTopicDetailResponseDto extends GetTopicResponseDto {
    @Expose()
    @Type(() => GetRegistrationInTopicDto)
    allUserRegistrations: GetRegistrationInTopicDto[]
}

export class RequestGetTopicsInPeriodBaseDto {}
export class RequestGetTopicsInPeriodDto extends IntersectionType(
    RequestGetTopicsInPeriodBaseDto,
    PaginationQueryDto
) {}

@Expose()
export class GetTopicsInPeriodDto {
    @Expose()
    _id: string
    @Expose()
    title: string
    @Expose()
    description: string
    @Expose()
    type: string
    @Expose()
    major: string
    @Expose()
    maxStudents: number
    @Expose()
    createBy: string
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    status: string
    @Expose()
    fieldNames: string[]
    @Expose()
    requirementNames: string[]
    studentNames: string[]
    @Expose()
    lecturerNames: string[]

    @Expose()
    currentStatus: string

    @Expose()
    currentPhase: string
    @Expose()
    periodId: string
    @Expose()
    allowManualApproval: boolean
}
export class GetPaginatedTopicsInPeriodDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetTopicsInPeriodDto)
    data: GetTopicsInPeriodDto[]
}

export class RequestGetTopicsInPhaseBaseDto {}
export class RequestGetTopicsInPhaseDto extends IntersectionType(RequestGetTopicsInPhaseBaseDto, PaginationQueryDto) {}

@Expose()
export class GetTopicsInPhaseDto extends GetTopicsInPeriodDto {}
export class GetPaginatedTopicsInPhaseDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetTopicsInPhaseDto)
    data: GetTopicsInPhaseDto[]
}
