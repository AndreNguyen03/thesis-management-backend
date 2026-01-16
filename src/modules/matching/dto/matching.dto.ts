import { OntologyExtractDto } from './ontology-extract.dto'
import { IsString, IsOptional, IsNumber, Min } from 'class-validator'

export class FindLecturersRequestDto {
    @IsString()
    studentId: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    topK?: number = 10
}

export class MatchedConceptDto {
    conceptKey: string
    label: string
    studentScore: number
    lecturerScore: number
    depth: number
}

export class LecturerMatchResultDto {
    lecturerId: string
    name: string
    faculty: string
    description: string
    phone: string
    email: string
    matchedConcepts: MatchedConceptDto[]
    overlapScore: number
    vectorScore: number
}

export class FindLecturersResponseDto {
    results: LecturerMatchResultDto[]
    totalMatched: number
}
