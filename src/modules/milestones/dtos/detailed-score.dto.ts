import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

// DTO cho điểm chi tiết từng tiêu chí
export class DetailedCriterionScoreDto {
    @ApiProperty({ example: '1', description: 'ID của tiêu chí chính (1, 2, 3, 4)' })
    @IsString()
    @IsNotEmpty()
    criterionId: string

    @ApiProperty({ example: '1.1', description: 'ID của tiêu chí con (optional)', required: false })
    @IsString()
    @IsOptional()
    subcriterionId?: string

    @ApiProperty({ example: 1.4, description: 'Điểm thực tế giảng viên chấm' })
    @IsNumber()
    @Min(0)
    score: number

    @ApiProperty({ example: 1.5, description: 'Điểm tối đa (copy từ template)' })
    @IsNumber()
    @Min(0)
    maxScore: number

    @ApiProperty({ example: 'LO2', description: 'ELO (copy từ template)', required: false })
    @IsString()
    @IsOptional()
    elo?: string
}

// DTO lưu nháp điểm (draft) - không validate đầy đủ
export class SaveDraftScoreDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID sinh viên (nếu chấm riêng)', required: false })
    @IsString()
    @IsOptional()
    studentId?: string

    @ApiProperty({ type: [DetailedCriterionScoreDto], description: 'Điểm chi tiết các tiêu chí' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetailedCriterionScoreDto)
    detailedScores: DetailedCriterionScoreDto[]

    @ApiProperty({ example: 'Sinh viên làm tốt phần thiết kế', description: 'Ghi chú chung', required: false })
    @IsString()
    @IsOptional()
    comment?: string
}

// DTO submit điểm chính thức
export class SubmitDetailedScoreDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID sinh viên (nếu chấm riêng)', required: false })
    @IsString()
    @IsOptional()
    studentId?: string

    @ApiProperty({ type: [DetailedCriterionScoreDto], description: 'Điểm chi tiết các tiêu chí (BẮT BUỘC đầy đủ)' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetailedCriterionScoreDto)
    detailedScores: DetailedCriterionScoreDto[]

    @ApiProperty({ example: 8.5, description: 'Tổng điểm (tự động tính từ detailedScores)' })
    @IsNumber()
    @Min(0)
    @Max(10)
    totalScore: number

    @ApiProperty({ example: 'Sinh viên có tiềm năng phát triển', description: 'Nhận xét chung', required: false })
    @IsString()
    @IsOptional()
    comment?: string
}
