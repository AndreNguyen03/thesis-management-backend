

export interface BaseRepositoryInterface<T> {
    create(dto: T | any): Promise<T>

    findOneById(id: string, projection?: string): Promise<T | null>
    checkExistsById(id: string): Promise<boolean>
    findOneByCondition(condition?: object, projection?: string): Promise<T | null>


    update(id: string, dto: Partial<T>): Promise<T | null>

    softDelete(id: string): Promise<boolean>
    findOneAndUpdate(condition: object, dto: Partial<T>): Promise<T | null>
    permanentlyDelete(id: string): Promise<boolean>
    findByCondition(condition?: object, projection?: string): Promise<T[] | null>

}
