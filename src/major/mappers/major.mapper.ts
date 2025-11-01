// mappers/major.mapper.ts
import { CreateMajorDto } from '../dtos/major.dtos'
import { Major } from '../schemas/major.schema'
import mongoose, { Types } from 'mongoose'

export class MajorMapper {
    static toEntity(dto: CreateMajorDto): Partial<Major> {
        return {
            name: dto.name,
            departmentId: new mongoose.Schema.Types.ObjectId(dto.departmentId)
        }
    }

    static toEntities(dtos: CreateMajorDto[]): Partial<Major>[] {
        return dtos.map(this.toEntity)
    }
}
