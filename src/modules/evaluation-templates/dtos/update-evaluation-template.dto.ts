import { PartialType } from '@nestjs/swagger'
import { CreateEvaluationTemplateDto } from './create-evaluation-template.dto'
import { IsBoolean, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateEvaluationTemplateDto extends PartialType(CreateEvaluationTemplateDto) {
    @ApiProperty({ example: true, description: 'Template còn active không', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
}
