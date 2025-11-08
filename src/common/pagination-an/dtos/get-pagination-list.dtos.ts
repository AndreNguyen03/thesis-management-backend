import { Expose } from "class-transformer"

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
export class LinkDto {
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