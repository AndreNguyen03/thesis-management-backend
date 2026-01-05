import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CouncilMemberScoreDto {
    @IsString()
    memberId: string

    @IsString()
    fullName: string

    @IsString()
    role: string

    @IsNumber()
    score: number

    @IsString()
    @IsOptional()
    note?: string
}

export class UpdateDefenseResultDto {
    @IsString()
    topicId: string

    @IsDate()
    @Type(() => Date)
    defenseDate: Date

    @IsString()
    periodName: string

    @IsNumber()
    finalScore: number

    @IsString()
    gradeText: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CouncilMemberScoreDto)
    councilMembers: CouncilMemberScoreDto[]

    @IsString()
    councilName: string

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean

    @IsBoolean()
    @IsOptional()
    isBlock?: boolean
}

export class BatchUpdateDefenseResultDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateDefenseResultDto)
    results: UpdateDefenseResultDto[]
}

export class PublishTopic {
    @IsString()
    topicId: string
    @IsBoolean()
    isPublished: boolean
}
export class BatchPublishTopic {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PublishTopic)
    topics: PublishTopic[]
}
