import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class GetRequirementReponseDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    slug: string
    @Expose()
    description: string
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
}

export class GetRequirementNameReponseDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    slug: string
}
export class PaginatedRequirements extends GetPaginatedObjectDto{
    @Expose()
    @Type(() => GetRequirementReponseDto)
    data: GetRequirementReponseDto[]
}
