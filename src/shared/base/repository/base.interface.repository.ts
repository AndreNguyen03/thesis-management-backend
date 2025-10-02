import { FilterQuery, QueryOptions, UpdateQuery } from 'mongoose'

export type FindAllResponse<T> = {
    count: number
    items: T[]
}

export interface BaseRepositoryInterface<T> {
    create(dto: Partial<T>): Promise<T>
    getAll(): Promise<T[]>

    findOneById(id: string, projection?: string | Record<string, unknown>): Promise<T | null>

    findOneByCondition(condition?: FilterQuery<T>, projection?: string | Record<string, unknown>): Promise<T | null>

    findAll(condition?: FilterQuery<T>, options?: QueryOptions<T>): Promise<FindAllResponse<T>>

    update(id: string, dto: UpdateQuery<T>): Promise<T | null>

    updateByCondition(condition: FilterQuery<T>, dto: UpdateQuery<T>): Promise<T | null>

    softDelete(id: string): Promise<boolean>

    permanentlyDelete(id: string): Promise<boolean>
}
