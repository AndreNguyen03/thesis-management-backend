import { Expose, Type } from 'class-transformer'

export class MetaDto {
    @Expose()
    itemsPerPage: number
    @Expose()
    totalItems: number
    @Expose()
    currentPage: number
    @Expose()
    totalPages: number
}
class LinkDto {
    @Expose()
    first?: string
    @Expose()
    previous?: string
    @Expose()
    current: string
    @Expose()
    next?: string
    @Expose()
    last?: string
}

export class GetPaginatedObjectDto {
    @Expose()
    @Type(() => MetaDto)
    meta: MetaDto
    // @Type(() => LinkDto)
    // links: LinkDto
}
