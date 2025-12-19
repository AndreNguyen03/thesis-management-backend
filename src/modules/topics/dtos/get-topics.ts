import { Expose, Transform, Type } from 'class-transformer'
import { IntersectionType } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { GetPaginatedObjectDto, MetaDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { GetFieldNameReponseDto } from '../../fields/dtos/get-fields.dto'
import { GetRequirementNameReponseDto } from '../../requirements/dtos/get-requirement.dto'
import { RelatedStudentInTopic, ResponseMiniStudentDto } from '../../../users/dtos/student.dto'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { GetMajorMiniDto } from '../../majors/dtos/get-major.dto'
import { GetMiniPeriodDto, GetPeriodDto } from '../../periods/dtos/period.dtos'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { GetUploadedFileDto } from '../../upload-files/dtos/upload-file.dtos'
import { GetMiniUserDto } from '../../../users/dtos/user.dto'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { PeriodType } from '../../periods/enums/periods.enum'
import { RegistrationDto } from './registration/get-students-in-topic'
import { StudentRegistrationStatus } from '../../registrations/enum/student-registration-status.enum'
export class GetDetailGrade {
    @Expose()
    _id: string
    @Expose()
    score: number
    @Expose()
    note: string
    @Expose()
    actorId: string
}
export class GetGrade {
    @Expose()
    averageScore: number
    @Expose()
    @Type(() => GetDetailGrade)
    detailGrades: GetDetailGrade[]
}
export class GetPhaseHistoryDto {
    @Expose()
    _id: string
    @Expose()
    phaseName: string
    @Expose()
    status: string
    @Expose()
    actor: GetMiniUserDto
    @Expose()
    notes: string
    @Expose()
    createdAt: Date
}

export class AbstractTopic {
    @Expose()
    _id: string

    @Expose()
    titleVN: string

    @Expose()
    titleEng: string

    @Expose()
    description: string

    @Expose()
    type: string

    @Expose()
    major: GetMajorMiniDto

    @Expose()
    @Type(() => GetFieldNameReponseDto)
    fields: GetFieldNameReponseDto[]

    @Expose()
    @Type(() => GetRequirementNameReponseDto)
    requirements: GetRequirementNameReponseDto[]
    @Expose()
    studentsNum: number

    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    lecturers: ResponseMiniLecturerDto[]

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date

    @Expose()
    maxStudents: number

    @Expose()
    currentStatus: string

    @Expose()
    currentPhase: string
    @Expose()
    allowManualApproval: boolean
}
export class GetSubmittedTopic extends AbstractTopic {
    @Expose()
    submittedAt: Date
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    createByInfo: ResponseMiniLecturerDto
    @Expose()
    @Type(() => GetMiniPeriodDto)
    periodInfo: GetMiniPeriodDto
}
// Tổng hợp các thuộc tính của đề tài chung cho việc hiển thị chi tiết phase của kì
export class GetGeneralTopics extends AbstractTopic {
    @Expose()
    submittedAt: Date
    @Expose()
    lastStatusInPhaseHistory: GetPhaseHistoryDto
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    createByInfo: ResponseMiniLecturerDto
    @Expose()
    @Type(() => GetMiniPeriodDto)
    periodInfo: GetMiniPeriodDto
    //file đính kèm
}

class TopicStatsDto {
    @Expose()
    views: number // Số lượt xem
    @Expose()
    downloads: number // Số lượt tải
    @Expose()
    averageRating: number // Điểm đánh giá trung bình (4.5)
    @Expose()
    reviewCount: number // Tổng số đánh giá (12)
}
class FileSnapshotDto {
    @Expose()
    fileId: string // Reference gốc để quản lý xóa/sửa
    @Expose()
    fileName: string // VD: "Bao_cao_final_v2.pdf"
    @Expose()
    fileUrl: string // URL từ S3/MinIO/Local để download trực tiếp
    @Expose()
    size: number
}

class FinalProduct {
    @Expose()
    @Type(() => FileSnapshotDto)
    thesisReport: FileSnapshotDto
    @Expose()
    sourceCodeUrl: string
    @Expose()
    @Type(() => FileSnapshotDto)
    sourceCodeZip: [FileSnapshotDto]
}
//thành viên trong hội đồng
class CouncilMemberSnapshot {
    @Expose()
    fullName: string
    @Expose()
    role: string // "Chủ tịch", "Thư ký"...
    @Expose()
    score: number
    @Expose()
    note: string
}

class DefenseResult {
    @Expose()
    defenseDate: Date // Dùng để lọc theo "Năm bảo vệ"
    @Expose()
    periodName: string // Lưu tên đợt: "HK1 23-24" (để hiển thị nhanh)
    @Expose()
    finalScore: number // Điểm số: 9.5
    @Expose()
    gradeText: string // Xếp loại: "Xuất sắc"
    @Expose()
    councilMembers: CouncilMemberSnapshot[]
    @Expose()
    councilName: string // VD: "Hội đồng CNPM 01"
}
//Định nghĩa đề tài nằm trong thư viện số
export class TopicsInLibrary extends AbstractTopic {
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    createByInfo: ResponseMiniLecturerDto
    @Expose()
    @Type(() => GetMiniPeriodDto)
    periodInfo: GetMiniPeriodDto
    @Expose()
    @Type(() => TopicStatsDto)
    stats: TopicStatsDto
    @Expose()
    year: string
    @Expose()
    @Type(() => FinalProduct)
    finalProduct: FinalProduct
    @Expose()
    @Type(() => ResponseMiniStudentDto)
    studentsRegistered: ResponseMiniStudentDto[]

    //kết quả bảo vệ
    @Expose()
    defenseResult: DefenseResult
}
//Phân trang lấy các đề tài nằm trong thư viện số
export class PaginatedTopicsInLibrary extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => TopicsInLibrary)
    data: TopicsInLibrary[]
}
export class PaginatedGeneralTopics extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetGeneralTopics)
    data: GetGeneralTopics[]
}
export class TopicsInPeriodMeta extends MetaDto {
    @Expose()
    @Type(() => GetPeriodDto)
    periodInfo: GetPeriodDto
}
export class PaginatedTopicsInPeriod {
    @Expose()
    @Type(() => GetGeneralTopics)
    data: GetGeneralTopics[]
    @Expose()
    meta: TopicsInPeriodMeta
}
export class PaginatedSubmittedTopics {
    @Expose()
    @Type(() => GetSubmittedTopic)
    data: GetSubmittedTopic[]
    @Expose()
    meta: TopicsInPeriodMeta
}
export class GetTopicResponseDto {
    @Expose()
    _id: string

    @Expose()
    titleVN: string

    @Expose()
    titleEng: string

    @Expose()
    type: string

    @Expose()
    description: string

    @Expose()
    @Type(() => GetMajorMiniDto)
    major: GetMajorMiniDto

    @Expose()
    periodId: string

    @Expose()
    maxStudents: number

    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    createByInfo: ResponseMiniLecturerDto

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date

    @Expose()
    currentStatus: string

    @Expose()
    currentPhase: string

    @Expose()
    @Type(() => GetFieldNameReponseDto)
    fields: GetFieldNameReponseDto[]

    @Expose()
    @Type(() => GetRequirementNameReponseDto)
    requirements: GetRequirementNameReponseDto[]

    @Expose()
    @Type(() => RelatedStudentInTopic)
    students: RelatedStudentInTopic
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    lecturers: ResponseMiniLecturerDto[]

    @Expose()
    registrationStatus: StudentRegistrationStatus

    @Expose()
    isSaved: boolean

    @Expose()
    isEditable: boolean

    @Expose()
    allowManualApproval: boolean

    @Expose()
    studentsNum: number
}
export class GetMiniTopicInfo {
    @Expose()
    _id: string
    @Expose()
    titleVN: string
    @Expose()
    titleEng: string
    @Expose()
    createBy: string
}
export class GetSubmmitedTopic extends GetTopicResponseDto {}
export class GetPaginatedTopicsDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetTopicResponseDto)
    data: GetTopicResponseDto[]
}
export class GetCancelRegisteredTopicResponseDto extends GetTopicResponseDto {
    @Expose()
    lastestCanceledRegisteredAt?: Date
}

export class GetTopicDetailResponseDto extends GetTopicResponseDto {
    @Expose()
    @Type(() => GetUploadedFileDto)
    files: GetUploadedFileDto[]

    @Expose()
    @Type(() => GetPhaseHistoryDto)
    phaseHistories: GetPhaseHistoryDto[]

    @Expose()
    @Type(() => GetGrade)
    grade: GetGrade
}

export class RequestGetTopicsInPeriodBaseDto {
    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    phase: string
}
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

export class RequestGetTopicsInPhaseBaseDto {
    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    phase: string
    @IsOptional()
    status: string
    @IsNotEmpty()
    //100 là search semantic
    //rule 99 nghĩa là phân trang để lọc với các trường cụ thể/ đặc thù
    //mặc định là lọc bình thường
    rulesPagination?: number = 0
    @IsOptional()
    lecturerIds?: string[]
    @IsOptional()
    fieldIds?: string[]
    @IsOptional()
    queryStatus?: string[]
    @IsOptional()
    majorIds?: string[]
}

export class RequestGetTopicsInPhaseParams extends IntersectionType(
    RequestGetTopicsInPhaseBaseDto,
    PaginationQueryDto
) {}

export class RequestLecturerGetTopicsInPhase {
    @IsOptional()
    @IsEnum(PeriodPhaseName)
    phase: string
    @IsOptional()
    status: string
}
export class RequestLectureGetTopicsInPhaseParams extends IntersectionType(
    RequestLecturerGetTopicsInPhase,
    PaginationQueryDto
) {}
export class RequestGetTopicsInAdvanceSearch {
    @IsNotEmpty()
    //100 là search semanticx
    //nếu là 0 thì search mặc định
    rulesPagination?: number = 0
    @IsOptional()
    status?: string
    @IsOptional()
    lecturerIds?: string[]
    @IsOptional()
    fieldIds?: string[]
    @IsOptional()
    queryStatus?: string[]
    @IsOptional()
    majorIds?: string[] | string
    @IsOptional()
    @IsString()
    year?: string
}

export class RequestGetTopicsInAdvanceSearchParams extends IntersectionType(
    RequestGetTopicsInAdvanceSearch,
    PaginationQueryDto
) {}

@Expose()
export class GetTopicsInPhaseDto extends GetTopicsInPeriodDto {}
export class GetPaginatedTopicsInPhaseDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetTopicsInPhaseDto)
    data: GetTopicsInPhaseDto[]
}

export class TopicsQueryParams {
    @IsOptional()
    phase: string
    @IsOptional()
    status: string
}
export class PaginationTopicsQueryParams extends IntersectionType(TopicsQueryParams, PaginationQueryDto) {}
