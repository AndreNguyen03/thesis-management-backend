import { Expose, Type } from 'class-transformer'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { PublicationDto } from '../../chatbot/dtos/get-enough-knowledge-result.dto'

export class MatchedConceptDto {
    @Expose()
    key: string

    @Expose()
    label: string

    @Expose()
    depth: number

    @Expose()
    weight: number

    @Expose()
    matchType: string

    @Expose()
    studentSources: string[]

    @Expose()
    lecturerSources: string[]
}

export class MatchedLecturerDto {
    @Expose()
    index: number

    @Expose()
    _id: string

    @Expose()
    fullName: string

    @Expose()
    email: string

    @Expose()
    bio?: string

    @Expose()
    title: string

    @Expose()
    @Type(() => GetFacultyDto)
    faculty?: GetFacultyDto

    @Expose()
    areaInterest?: string[]

    @Expose()
    researchInterests?: string[]

    @Expose()
    @Type(() => PublicationDto)
    publications?: PublicationDto[]

    @Expose()
    score: number

    @Expose()
    coreScore: number

    @Expose()
    boostScore: number

    @Expose()
    conceptCount: number

    @Expose()
    @Type(() => MatchedConceptDto)
    matchedConcepts: MatchedConceptDto[]

    @Expose()
    matchReason: string
}

export class MatchLecturerResponseDto {
    @Expose()
    total: number

    @Expose()
    profileSummary: string

    @Expose()
    @Type(() => MatchedLecturerDto)
    lecturers: MatchedLecturerDto[]
}
