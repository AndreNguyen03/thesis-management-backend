import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class GetFieldReponseDto {
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

export class GetFieldNameReponseDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    slug: string
}
export class PaginatedFieldNameResponse extends GetPaginatedObjectDto{
    @Expose()
    @Type(() => GetFieldNameReponseDto)
    data: GetFieldNameReponseDto[]
}
