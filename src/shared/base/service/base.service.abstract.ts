import { FindAllResponse } from "src/shared/types/common.type"
import { BaseEntity } from "../entity/base.entity"
import { BaseRepositoryInterface } from "../repository/base.repository.interface"
import { BaseServiceInterface } from "./base.service.interface"

export abstract class BaseServiceAbstract<T extends BaseEntity> implements BaseServiceInterface<T> {
    constructor(private readonly repository: BaseRepositoryInterface<T>) {}

    async create(create_dto: T | any): Promise<T> {
        return await this.repository.create(create_dto)
    }

    async findAll(filter?: object, options?: object): Promise<FindAllResponse<T>> {
        return await this.repository.findAll(filter ?? {}, options ?? {})
    }
    async findOneById(id: string): Promise<T | null> {
        return await this.repository.findOneById(id)
    }

    async update(id: string, update_dto: Partial<T>) {
        return await this.repository.update(id, update_dto)
    }

    async remove(id: string) {
        return await this.repository.softDelete(id)
    }
}
