import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { TopicStatus } from '../../topics/enum'
import { Type } from 'class-transformer'

export class GetTopicsInDefenseMilestoneQuery {
    @IsOptional()
    @IsEnum(TopicStatus)
    status?: TopicStatus

    @IsOptional()
    @IsString()
    search?: string

    @IsOptional()
    isScored?: boolean // Đã chấm điểm hay chưa

    @IsOptional()
    isInLibrary?: boolean // Đã trong thư viện hay chưa

    @IsOptional()
    @Type(() => Number)
    page?: number = 1

    @IsOptional()
    @Type(() => Number)
    limit?: number = 20
}

export class BulkArchiveTopicsDto {
    @IsArray()
    @IsNotEmpty()
    topicIds: string[]

    @IsOptional()
    @IsString()
    note?: string
}

export class BulkHideTopicsDto {
    @IsArray()
    @IsNotEmpty()
    topicIds: string[]

    @IsNotEmpty()
    isHidden: boolean // true = ẩn, false = hiện lại

    @IsOptional()
    @IsString()
    reason?: string
}
