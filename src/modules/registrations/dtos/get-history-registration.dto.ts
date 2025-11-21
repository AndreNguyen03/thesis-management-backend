import { Expose, Type } from 'class-transformer'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

class GetStudentRegistrationsHistoryDto {
    @Expose()
    _id: string
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
    periodId: string
}
export class GetPaginatedStudentRegistrationsHistory extends GetPaginatedObjectDto {
    @Type(() => GetStudentRegistrationsHistoryDto)
    @Expose()
    data: GetStudentRegistrationsHistoryDto[]
}
