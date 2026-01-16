import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class SubCriterionDto {
    @ApiProperty({ example: '1.1', description: 'ID của tiêu chí con' })
    @IsString()
    @IsNotEmpty()
    id: string

    @ApiProperty({ example: 'Tính mới và độ phức tạp', description: 'Tên tiêu chí con' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 1.5, description: 'Điểm tối đa' })
    @IsNumber()
    @Min(0)
    maxScore: number

    @ApiProperty({ example: 'LO2', description: 'Expected Learning Outcomes' })
    @IsString()
    @IsNotEmpty()
    elos: string
}

export class EvaluationCriterionDto {
    @ApiProperty({ example: '1', description: 'ID của tiêu chí chính' })
    @IsString()
    @IsNotEmpty()
    id: string

    @ApiProperty({ example: 'Ý nghĩa khoa học, giá trị thực tiễn', description: 'Tên tiêu chí chính' })
    @IsString()
    @IsNotEmpty()
    category: string

    @ApiProperty({ example: 3.0, description: 'Điểm tối đa' })
    @IsNumber()
    @Min(0)
    maxScore: number

    @ApiProperty({ example: 'LO2, LO3', description: 'Expected Learning Outcomes' })
    @IsString()
    @IsNotEmpty()
    elos: string

    @ApiProperty({ type: [SubCriterionDto], description: 'Danh sách tiêu chí con' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SubCriterionDto)
    subcriteria: SubCriterionDto[]
}

export class CreateEvaluationTemplateDto {
    @ApiProperty({ example: 'KLTN-7 - Khoa Công nghệ Thông tin', description: 'Tên template' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID của khoa' })
    @IsString()
    @IsNotEmpty()
    facultyId: string

    @ApiProperty({ type: [EvaluationCriterionDto], description: 'Danh sách tiêu chí đánh giá' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvaluationCriterionDto)
    criteria: EvaluationCriterionDto[]

    @ApiProperty({
        example: 'Template đánh giá KLTN dành cho sinh viên ngành KTPM',
        description: 'Mô tả template',
        required: false
    })
    @IsString()
    @IsOptional()
    description?: string
}
