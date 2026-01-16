import { ApiProperty } from '@nestjs/swagger'

export class InferredConceptDto {
    @ApiProperty({ description: 'Concept key', example: 'cs.ai.machine_learning' })
    key: string

    @ApiProperty({ description: 'Concept label', example: 'Machine Learning' })
    label: string

    @ApiProperty({ description: 'Concept aliases', example: ['ML', 'Machine Learning'] })
    aliases: string[]

    @ApiProperty({ description: 'Concept depth', example: 3 })
    depth: number

    @ApiProperty({ description: 'Match score (0-1)', example: 0.95 })
    score: number

    @ApiProperty({ description: 'Match source (interests or skills)', example: 'skills' })
    source: string

    @ApiProperty({ description: 'Original text that matched', example: 'machine learning' })
    matchedText: string
}

export class InferConceptResponseDto {
    @ApiProperty({ description: 'Student ID' })
    studentId: string

    @ApiProperty({ description: 'Array of concept keys', example: ['cs.ai.ml', 'cs.ai.nlp'] })
    keys: string[]

    @ApiProperty({ description: 'Array of concept labels', example: ['Machine Learning', 'NLP'] })
    labels: string[]

    @ApiProperty({ description: 'Array of concept aliases' })
    aliases: string[][]

    @ApiProperty({ description: 'Detailed concept information', type: [InferredConceptDto] })
    concepts: InferredConceptDto[]

    @ApiProperty({ description: 'Total concepts found' })
    totalConcepts: number
}
