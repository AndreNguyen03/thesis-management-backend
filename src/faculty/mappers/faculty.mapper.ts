// mappers/Faculty.mapper.ts
import { CreateFacultyDto } from '../dtos/faculty.dtos'
import { Faculty } from '../schemas/faculty.schema'
import mongoose, { Types } from 'mongoose'

export class FacultyMapper {
    static toEntity(dto: CreateFacultyDto): Partial<Faculty> {
        return {
            name: dto.name,
            email: dto.email,
            url: dto.url
        }
    }

    static toEntities(dtos: CreateFacultyDto[]): Partial<Faculty>[] {
        return dtos.map(this.toEntity)
    }
}
