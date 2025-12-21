import { Expose, Type } from 'class-transformer'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { GetPaginatedObjectDto, MetaDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { GetMiniPeriodDto } from '../../periods/dtos/period.dtos'
import { T } from '@faker-js/faker/dist/airline-CLphikKp'

class GetStudentRegistrationsHistoryDto {
    @Expose()
    _id: string
    @Expose()
    topicId: string
    @Expose()
    titleVN: string
    @Expose()
    titleEng: string
    @Expose()
    type: string
    @Expose()
    major: string
    @Expose()
    topicStatus: string
    @Expose()
    registrationStatus: string
    @Expose()
    registeredAt: Date
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    lecturers: ResponseMiniLecturerDto[]
    @Expose()
    periodName: string
    @Expose()
    @Type(() => GetMiniPeriodDto)
    periodInfo: GetMiniPeriodDto
    @Expose()
    lecturerResponse: string
    @Expose()
    rejectionReasonType: string
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    processedBy: ResponseMiniLecturerDto
}
export class MetaCustom extends MetaDto {
    @Expose()
    @Type(() => GetMiniPeriodDto)
    periodOptions: GetMiniPeriodDto[]
}
export class GetPaginatedStudentRegistrationsHistory {
    @Type(() => GetStudentRegistrationsHistoryDto)
    @Expose()
    data: GetStudentRegistrationsHistoryDto[]
    @Expose()
    @Type(() => MetaCustom)
    meta: MetaCustom
}
