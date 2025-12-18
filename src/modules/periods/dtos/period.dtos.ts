import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { PeriodType } from '../enums/periods.enum'
import { Expose, Type } from 'class-transformer'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { GetPeriodPhaseDto } from './period-phases.dtos'

export class CreatePeriodDto {
    @IsNotEmpty()
    year: string
    @IsNotEmpty()
    semester: number
    @IsNotEmpty()
    @IsEnum(PeriodType)
    type: string
    @IsNotEmpty()
    @IsDate()
    startTime: Date = new Date()
    @IsNotEmpty()
    @IsDate()
    endTime: Date
}
export class GetMiniPeriodDto {
    @Expose()
    _id: string
    @Expose()
    year: string
    @Expose()
    semester: number
    @Expose()
    @Type(() => GetFacultyDto)
    faculty: GetFacultyDto
}
export class UpdatePeriodDto {
    @IsOptional()
    @IsString()
    year: string
    @IsOptional()
    @IsNumber()
    semester: number
    @IsOptional()
    @IsString()
    type: string
    @IsOptional()
    @IsString()
    startTime: string
    @IsOptional()
    @IsString()
    endTime: string
}

export class GetPeriodDto {
    @Expose()
    _id: string
    @Expose()
    year: string
    @Expose()
    semester: number
    @Expose()
    type: string
    @Expose()
    @Type(() => GetFacultyDto)
    faculty: GetFacultyDto
    @Expose()
    @Type(() => GetPeriodPhaseDto)
    phases: GetPeriodPhaseDto[]
    @Expose()
    status: string
    @Expose()
    currentPhase: string
    @Expose()
    startTime: Date
    @Expose()
    endTime: Date
    @Expose()
    @Type(() => GetPeriodPhaseDto)
    currentPhaseDetail: GetPeriodPhaseDto
}

export class GetPaginatedPeriodDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetPeriodDto)
    data: GetPeriodDto[]
}

export class PeriodStatsQueryParams {
    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    phase: PeriodPhaseName
}

export class Badge {
    @Expose()
    text: string
    @Expose()
    varient: string
}
export class Label {
    @Expose()
    text: string
    @Expose()
    color: string
}
export class NavItem {
    @Expose()
    url: string
    @Expose()
    title: string
    @Expose()
    isDisabled: boolean
    @Expose()
    badge: Badge
    @Expose()
    note: string
}

export class GetCurrentPeriod {
    @Expose()
    _id: string
    @Expose()
    @Expose()
    year: string
    @Expose()
    semester: number
    @Expose()
    type: PeriodType
    @Expose()
    facultyName: string
    @Expose()
    status: string
    @Expose()
    startTime: Date
    @Expose()
    endTime: Date
    @Expose()
    currentPhaseDetail: GetPeriodPhaseDto
    @Expose()
    isActiveAction: boolean
    @Expose()
    @Type(() => NavItem)
    navItem: NavItem[]
}
