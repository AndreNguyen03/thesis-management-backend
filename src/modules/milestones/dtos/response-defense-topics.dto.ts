import { Expose, Type } from 'class-transformer'

export class StudentInTopicDto {
    @Expose()
    userId: string

    @Expose()
    fullName: string

    @Expose()
    studentCode?: string

    @Expose()
    email?: string
}

export class LecturerInTopicDto {
    @Expose()
    userId: string

    @Expose()
    fullName: string

    @Expose()
    title: string

    @Expose()
    roleInTopic?: string
}

export class DefenseTopicItemDto {
    @Expose()
    topicId: string

    @Expose()
    titleVN: string

    @Expose()
    titleEng: string

    @Expose()
    @Type(() => StudentInTopicDto)
    students: StudentInTopicDto[]

    @Expose()
    @Type(() => LecturerInTopicDto)
    lecturers: LecturerInTopicDto[]

    @Expose()
    finalScore?: number

    @Expose()
    gradeText?: string

    @Expose()
    isScored: boolean // Đã chấm điểm chưa

    @Expose()
    isLocked: boolean // Đã khóa điểm chưa

    @Expose()
    isPublishedToLibrary: boolean

    @Expose()
    isHiddenInLibrary: boolean

    @Expose()
    currentStatus: string

    @Expose()
    councilName?: string

    @Expose()
    defenseDate?: Date

    @Expose()
    hasFullDocuments: boolean // Có đầy đủ tài liệu không
}

export class PaginatedDefenseTopicsDto {
    @Expose()
    @Type(() => DefenseTopicItemDto)
    topics: DefenseTopicItemDto[]

    @Expose()
    total: number

    @Expose()
    page: number

    @Expose()
    limit: number

    @Expose()
    totalPages: number
}

export class BulkOperationResultDto {
    @Expose()
    success: boolean

    @Expose()
    successCount: number

    @Expose()
    failedCount: number

    @Expose()
    failedTopics?: Array<{
        topicId: string
        reason: string
    }>

    @Expose()
    message: string
}
