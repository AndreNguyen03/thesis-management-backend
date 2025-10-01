import { IsString, IsBoolean, IsOptional, IsArray, IsEmail, IsNumber, ValidateNested } from 'class-validator'
import { Type, Expose } from 'class-transformer'
import { OmitType, PartialType } from '@nestjs/mapped-types'
import { Lecturer } from '../schemas/lecturer.schema'

// --- Nested DTO ---
export class EducationDto {
    @IsOptional() @IsString() @Expose() degree?: string
    @IsOptional() @IsString() @Expose() university?: string
    @IsOptional() @IsString() @Expose() year?: string
    @IsOptional() @IsString() @Expose() specialization?: string
}

export class PublicationDto {
    @IsOptional() @IsString() @Expose() title?: string
    @IsOptional() @IsString() @Expose() journal?: string
    @IsOptional() @IsString() @Expose() conference?: string
    @IsOptional() @IsString() @Expose() year?: string
    @IsOptional() @IsString() @Expose() type?: string
    @IsOptional() @IsNumber() @Expose() citations?: number
}

export class ProjectDto {
    @IsOptional() @IsString() @Expose() title?: string
    @IsOptional() @IsString() @Expose() duration?: string
    @IsOptional() @IsString() @Expose() funding?: string
    @IsOptional() @IsString() @Expose() role?: string
    @IsOptional() @IsString() @Expose() budget?: string
}

export class ThesisDto {
    @IsOptional() @IsString() @Expose() year?: string
    @IsOptional() @IsString() @Expose() title?: string
    @IsOptional() @IsString() @Expose() student?: string
    @IsOptional() @IsString() @Expose() result?: string
    @IsOptional() @IsString() @Expose() field?: string
}

export class CurrentThesisDto {
    @IsOptional() @IsString() @Expose() title?: string
    @IsOptional() @IsString() @Expose() field?: string
    @IsOptional() @IsNumber() @Expose() slotsLeft?: number
    @IsOptional() @IsNumber() @Expose() totalSlots?: number
    @IsOptional() @IsString() @Expose() deadline?: string
    @IsOptional() @IsNumber() @Expose() difficulty?: number
}

export class ThesisStatsDto {
    @IsOptional() @IsNumber() @Expose() total?: number
    @IsOptional() @IsNumber() @Expose() completed?: number
    @IsOptional() @IsNumber() @Expose() ongoing?: number
    @IsOptional() @IsNumber() @Expose() excellent?: number
    @IsOptional() @IsNumber() @Expose() good?: number
    @IsOptional() @IsNumber() @Expose() average?: number
    @IsOptional() @IsNumber() @Expose() successRate?: number
}

// --- Update Lecturer DTO (input) ---
export class UpdateLecturerDto {
    @IsOptional() @IsString() id?: string
    @IsOptional() @IsString() role?: 'lecturer'
    @IsOptional() @IsEmail() email?: string
    @IsOptional() @IsString() fullName?: string
    @IsOptional() @IsString() password?: string
    @IsOptional() @IsString() phone?: string
    @IsOptional() @IsString() avatar?: string
    @IsOptional() @IsBoolean() isActive?: boolean
    @IsOptional() @IsString() position?: string
    @IsOptional() @IsString() department?: string
    @IsOptional() @IsString() faculty?: string
    @IsOptional() @IsString() university?: string
    @IsOptional() @IsString() office?: string
    @IsOptional() @IsArray() @IsString({ each: true }) expertise?: string[]
    @IsOptional() @IsArray() @IsString({ each: true }) researchInterests?: string[]
    @IsOptional() @IsString() bio?: string

    @IsOptional() @ValidateNested({ each: true }) @Type(() => EducationDto) education?: EducationDto[]
    @IsOptional() @ValidateNested({ each: true }) @Type(() => PublicationDto) publications?: PublicationDto[]
    @IsOptional() @ValidateNested({ each: true }) @Type(() => ProjectDto) projects?: ProjectDto[]
    @IsOptional() @ValidateNested() @Type(() => ThesisStatsDto) thesisStats?: ThesisStatsDto
    @IsOptional() @ValidateNested({ each: true }) @Type(() => ThesisDto) completedThesis?: ThesisDto[]
    @IsOptional() @ValidateNested({ each: true }) @Type(() => CurrentThesisDto) currentThesis?: CurrentThesisDto[]
}

// --- Lecturer Response DTO (output) ---
export class LecturerResponseDto {
    @Expose() @IsString() id: string
    @Expose() @IsString() email: string
    @Expose() @IsString() fullName: string
    @Expose() @IsString() role: string
    @Expose() @IsString() phone: string
    @Expose() @IsBoolean() isActive: boolean
    @Expose() @IsString() avatar: string
    @Expose() @IsString() position: string
    @Expose() @IsString() department: string
    @Expose() @IsString() faculty: string
    @Expose() @IsString() university: string
    @Expose() @IsString() office: string
    @Expose() @IsArray() @IsString({ each: true }) expertise: string[]
    @Expose() @IsArray() @IsString({ each: true }) researchInterests: string[]
    @Expose() @IsString() bio: string

    @Expose() @ValidateNested({ each: true }) @Type(() => EducationDto) education: EducationDto[]
    @Expose() @ValidateNested({ each: true }) @Type(() => PublicationDto) publications: PublicationDto[]
    @Expose() @ValidateNested({ each: true }) @Type(() => ProjectDto) projects: ProjectDto[]
    @Expose() @ValidateNested() @Type(() => ThesisStatsDto) thesisStats: ThesisStatsDto
    @Expose() @ValidateNested({ each: true }) @Type(() => ThesisDto) completedThesis: ThesisDto[]
    @Expose() @ValidateNested({ each: true }) @Type(() => CurrentThesisDto) currentThesis: CurrentThesisDto[]
}
