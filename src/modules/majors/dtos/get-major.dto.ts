import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class GetMajorMiniDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    facultyId: string
}
export class GetMiniMiniMajorDto {
    @Expose()
    _id: string
    @Expose()
    name: string
}

export class PaginatedMajorsDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetMiniMiniMajorDto)
    data: GetMiniMiniMajorDto[]
}

export class GetMajorLibraryCombox {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    facultyName: string
    @Expose()
    count:number
}
