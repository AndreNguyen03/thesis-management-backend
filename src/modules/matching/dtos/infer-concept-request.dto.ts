import { IsMongoId, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class InferConceptRequestDto {
    @ApiProperty({
        description: 'Student ID to infer concepts from',
        example: '507f1f77bcf86cd799439011'
    })
    @IsMongoId()
    @IsNotEmpty()
    studentId: string
}
