import { Paginated } from "../../../common/pagination-an/interfaces/paginated.interface"

export interface Write<T> {
    create(item: T | any): Promise<T>
    update(id: string, item: Partial<T>): Promise<T | null>
    remove(id: string): Promise<boolean>
}

export interface Read<T> {
    findOneById(id: string): Promise<T | null>
    findOneByCondition(condition?: object, projection?: string): Promise<T | null>
}

export interface BaseServiceInterface<T> extends Write<T>, Read<T> {}
