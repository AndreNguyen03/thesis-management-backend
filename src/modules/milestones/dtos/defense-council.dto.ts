import {
    IsArray,
    IsBoolean,
    IsDate,
    isEnum,
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested
} from 'class-validator'
import { Type } from 'class-transformer'
import { CouncilMemberRole, ScoreType } from '../schemas/defense-council.schema'
import { IntersectionType } from '@nestjs/mapped-types'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

// DTO cho thành viên hội đồng
export class CouncilMemberDto {
    @IsMongoId()
    @IsNotEmpty()
    memberId: string

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsString()
    @IsOptional()
    title?: string

    @IsEnum(CouncilMemberRole)
    @IsNotEmpty()
    role: CouncilMemberRole
}

// DTO tạo hội đồng bảo vệ
export class CreateDefenseCouncilDto {
    @IsMongoId()
    @IsNotEmpty()
    milestoneTemplateId: string

    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsNotEmpty()
    location: string

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    scheduledDate: Date
}

// DTO thêm đề tài vào hội đồng
export class AddTopicToCouncilDto {
    @IsMongoId()
    @IsNotEmpty()
    topicId: string

    @IsString()
    @IsNotEmpty()
    titleVN: string

    @IsString()
    @IsOptional()
    titleEng?: string

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    studentNames?: string[]

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    lecturerNames?: string[]

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CouncilMemberDto)
    @IsNotEmpty()
    members: CouncilMemberDto[] // Bộ ba giảng viên RIÊNG cho đề tài này

    @IsNumber()
    @IsOptional()
    defenseOrder?: number
}

// DTO thêm nhiều đề tài vào hội đồng cùng lúc
export class AddMultipleTopicsToCouncilDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddTopicToCouncilDto)
    @IsNotEmpty()
    topics: AddTopicToCouncilDto[]
    @IsNotEmpty()
    periodId: string
}

// DTO cập nhật bộ ba giảng viên cho đề tài
export class UpdateTopicMembersDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CouncilMemberDto)
    @IsNotEmpty()
    members: CouncilMemberDto[]
}

// DTO chấm điểm đơn lẻ (1 người chấm)
export class ScoreItemDto {
    @IsMongoId()
    @IsNotEmpty()
    scorerId: string

    @IsString()
    @IsNotEmpty()
    scorerName: string

    @IsEnum(ScoreType)
    @IsNotEmpty()
    scoreType: ScoreType

    @IsNumber()
    @Min(0)
    @Max(10)
    @IsNotEmpty()
    total: number

    @IsString()
    @IsOptional()
    comment?: string
}

// DTO chấm điểm (giảng viên tự chấm)
export class SubmitScoreDto {
    @IsMongoId()
    @IsNotEmpty()
    topicId: string

    @IsEnum(ScoreType)
    @IsNotEmpty()
    scoreType: 'council_member' | 'reviewer' | 'supervisor'

    @IsNumber()
    @Min(0)
    @Max(10)
    @IsNotEmpty()
    total: number

    @IsString()
    @IsOptional()
    comment?: string
}

// DTO thư ký nhập điểm cho đề tài (tất cả thành viên cùng lúc)
export class SubmitTopicScoresDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScoreItemDto)
    @IsNotEmpty()
    scores: ScoreItemDto[]
}

// DTO khóa hội đồng
export class CompleteCouncilDto {
    @IsString()
    @IsOptional()
    note?: string
}

// DTO công bố điểm
export class PublishCouncilDto {
    @IsBoolean()
    @IsOptional()
    sendEmail?: boolean = true
}

// DTO cập nhật thông tin hội đồng
export class UpdateDefenseCouncilDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    location?: string

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    scheduledDate?: Date

    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}

// DTO cập nhật thứ tự bảo vệ
export class UpdateTopicOrderDto {
    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    defenseOrder: number
}

// DTO xóa đề tài khỏi hội đồng
export class RemoveTopicFromCouncilDto {
    @IsMongoId()
    @IsNotEmpty()
    topicId: string
}

// DTO query lọc hội đồng
export class QueryDefenseCouncilsDto {
    @IsMongoId()
    @IsOptional()
    milestoneTemplateId?: string

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    fromDate?: Date

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    toDate?: Date

    @IsBoolean()
    @Type(() => Boolean)
    @IsOptional()
    isCompleted?: boolean

    @IsBoolean()
    @Type(() => Boolean)
    @IsOptional()
    isPublished?: boolean
}

export class GetDefenseCouncilsQuery extends IntersectionType(QueryDefenseCouncilsDto, PaginationQueryDto) {}
