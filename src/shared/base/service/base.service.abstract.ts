import { BadRequestException } from '@nestjs/common'
import { BaseEntity } from '../entity/base.entity'
import { BaseRepositoryInterface } from '../repository/base.repository.interface'
import { BaseServiceInterface } from './base.service.interface'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

export abstract class BaseServiceAbstract<T extends BaseEntity> implements BaseServiceInterface<T> {
    constructor(private readonly repository: BaseRepositoryInterface<T>) {}

    async create(create_dto: T | any): Promise<T> {
        return await this.repository.create(create_dto)
    }

    async findOneById(id: string): Promise<T | null> {
        return await this.repository.findOneById(id)
    }
    async findOneByCondition(condition?: object, projection?: string): Promise<T | null> {
        return await this.repository.findOneByCondition(condition, projection)
    }
    async findByCondition(condition?: object, projection?: string): Promise<T[] | null> {
        return await this.repository.findByCondition(condition, projection)
    }
    async update(id: string, update_dto: Partial<T>) {
        return await this.repository.update(id, update_dto)
    }
    async findOneAndUpdate(condition: object, update_dto: Partial<T>): Promise<T | null> {
        return await this.repository.findOneAndUpdate(condition, update_dto)
    }

    async remove(id: string) {
        const existingModel = await this.repository.findOneById(id)
        if (!existingModel) {
            throw new BadRequestException(`Đối tượng cần xóa không tồn tại`)
        }
        return await this.repository.softDelete(id)
    }
}
