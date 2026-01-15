import { IsString, IsArray, IsOptional, IsEnum, IsNumber, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

export enum ConceptCandidateStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

export class ConceptCandidateExampleDto {
    @Expose()
    @ApiProperty({ description: 'Profile ID where token was found' })
    profileId: string

    @Expose()
    @ApiProperty({ description: 'Profile type (student, lecturer, topic)' })
    profileType: string

    @Expose()
    @ApiProperty({ description: 'Source field (skills, interests, areaInterest, etc.)' })
    source: string

    @Expose()
    @ApiProperty({ description: 'Original token text' })
    token: string
}

export class CreateConceptCandidateDto {
    @IsString()
    @ApiProperty({ description: 'Canonical token representing the concept' })
    canonical: string

    @IsArray()
    @IsString({ each: true })
    @ApiProperty({ description: 'Token variants/aliases', type: [String] })
    variants: string[]

    @IsNumber()
    @Min(1)
    @ApiProperty({ description: 'Frequency count across profiles' })
    frequency: number

    @IsArray()
    @Type(() => ConceptCandidateExampleDto)
    @ApiProperty({ description: 'Example usages from profiles', type: [ConceptCandidateExampleDto] })
    examples: ConceptCandidateExampleDto[]

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Suggested parent concept key' })
    suggestedParent?: string

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Suggested label for the concept' })
    suggestedLabel?: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ApiPropertyOptional({ description: 'Suggested aliases', type: [String] })
    suggestedAliases?: string[]
}

export class ApproveConceptDto {
    @IsString()
    @ApiProperty({ description: 'Final concept key (e.g., it.ai.deep_learning)' })
    key: string

    @IsString()
    @ApiProperty({ description: 'Concept label (e.g., Deep Learning)' })
    label: string

    @IsArray()
    @IsString({ each: true })
    @ApiProperty({ description: 'Concept aliases', type: [String] })
    aliases: string[]

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Parent concept key' })
    parent?: string

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Concept description' })
    description?: string
}

export class ConceptCandidateResponseDto {
    @Expose()
    @ApiProperty({ description: 'Candidate ID' })
    _id: string

    @Expose()
    @ApiProperty({ description: 'Canonical token' })
    canonical: string

    @Expose()
    @ApiProperty({ description: 'Token variants', type: [String] })
    variants: string[]

    @Expose()
    @ApiProperty({ description: 'Frequency count' })
    frequency: number

    @Expose()
    @ApiProperty({ description: 'Example usages', type: [ConceptCandidateExampleDto] })
    examples: ConceptCandidateExampleDto[]

    @Expose()
    @ApiPropertyOptional({ description: 'Suggested parent key' })
    suggestedParent?: string

    @Expose()
    @ApiPropertyOptional({ description: 'Suggested label' })
    suggestedLabel?: string

    @Expose()
    @ApiPropertyOptional({ description: 'Suggested aliases', type: [String] })
    suggestedAliases?: string[]

    @Expose()
    @ApiProperty({ enum: ConceptCandidateStatus, description: 'Candidate status' })
    status: ConceptCandidateStatus

    @Expose()
    @ApiProperty({ description: 'Created at' })
    createdAt: Date

    @Expose()
    @ApiPropertyOptional({ description: 'Approved at' })
    approvedAt?: Date

    @Expose()
    @ApiPropertyOptional({ description: 'Approved by user ID' })
    approvedBy?: string

    @Expose()
    @ApiPropertyOptional({ description: 'Rejection reason' })
    rejectionReason?: string
}

export class RejectConceptDto {
    @IsString()
    @ApiProperty({ description: 'Reason for rejection' })
    reason: string
}

export class ConceptCandidateListQueryDto {
    @IsOptional()
    @IsEnum(ConceptCandidateStatus)
    @ApiPropertyOptional({ enum: ConceptCandidateStatus, description: 'Filter by status' })
    status?: ConceptCandidateStatus

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    page?: number = 1

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    limit?: number = 20

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Sort by field (frequency, createdAt)', default: 'frequency' })
    sortBy?: string = 'frequency'

    @IsOptional()
    @IsEnum(['asc', 'desc'])
    @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' })
    sortOrder?: 'asc' | 'desc' = 'desc'
}
