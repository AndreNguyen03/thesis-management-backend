// mappers/Field.mapper.ts
import { CreateFieldDto } from '../dtos/field.dtos'
import { Field } from '../schemas/field.schema'

export class FieldMapper {
    static toEntity(dto: CreateFieldDto): Partial<Field> {
        return {
            name: dto.name,
            description: dto.description,
            slug: dto.slug
        }
    }

    static toEntities(dtos: CreateFieldDto[]): Partial<Field>[] {
        return dtos.map(this.toEntity)
    }
}
