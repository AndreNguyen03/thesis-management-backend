import { FilterQuery } from 'mongoose'
import { Paginated } from '../../../common/pagination/interface/paginated.interface'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'

export interface BaseRepositoryInterface<T> {
    create(dto: T | any): Promise<T>

    findOneById(id: string, projection?: string): Promise<T | null>
    checkExistsById(id: string): Promise<boolean>
    findOneByCondition(condition?: object, projection?: string): Promise<T | null>

    findAll(condition: object, options?: object): Promise<Paginated<T>>

    update(id: string, dto: Partial<T>): Promise<T | null>

    softDelete(id: string): Promise<boolean>
    findOneAndUpdate(condition: object, dto: Partial<T>): Promise<T | null>
    permanentlyDelete(id: string): Promise<boolean>
    findByCondition(condition?: object, projection?: string): Promise<T[] | null>
    paginate(
        condition: object,
        paginationQuery: PaginationQueryDto,
        populate?: string | string[] | any[]
    ): Promise<Paginated<T>>
}
