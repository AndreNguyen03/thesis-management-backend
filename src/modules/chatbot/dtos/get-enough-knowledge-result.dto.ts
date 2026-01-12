import { Expose, Type } from 'class-transformer'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
export class PublicationDto {
    @Expose()
    title: string
    @Expose()
    @Expose()
    journal: string
    @Expose()
    conference: string
    @Expose()
    link?: string
    @Expose()
    year: string
    @Expose()
    type: string
    @Expose()
    citations: number
}
export class LecturerKnowledgeDto {
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
    faculty: GetFacultyDto
    @Expose()
    areaInterest: string[]
    @Expose()
    researchInterests: string[]
    @Expose()
    publications: PublicationDto[]

}
