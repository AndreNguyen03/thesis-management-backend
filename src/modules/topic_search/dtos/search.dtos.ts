import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { PeriodType } from '../../periods/enums/periods.enum'

export class SearchRegisteringTopicsDto {
    @IsNotEmpty()
    @IsString()
    description: string
    @IsNotEmpty()
    @IsString()
    //loại của kì hiện tại là thesi hay sciencetifi_search
    type: string
}

export class SearchTopicsInLibraryDto {
    @IsNotEmpty()
    @IsString()
    description: string
    @IsOptional()
    @IsString()
    facultyId?: string
    @IsOptional()
    @IsString()
    periodId?: string
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    lecturerIds?: string[]
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requirementIds?: string[]
}
