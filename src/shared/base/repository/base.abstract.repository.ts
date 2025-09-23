import { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose'
import { BaseRepositoryInterface, FindAllResponse } from './base.interface.repository'
import { BaseEntity } from '../entity/base.entity'

export abstract class BaseRepositoryAbstract<T extends BaseEntity> implements BaseRepositoryInterface<T> {
    protected constructor(protected readonly model: Model<T>) {
        this.model = model
    }

    async create(dto: Partial<T>): Promise<T> {
        const created = await this.model.create(dto)
        return created.save()
    }

    async findOneById(id: string, projection?: string): Promise<T | null> {
        const item = await this.model.findById(id, projection).exec()
        if (!item || item.deleted_at) {
            return null
        }
        return item
    }

    async findOneByCondition(condition: FilterQuery<T> = {}, projection?: string): Promise<T | null> {
        return this.model.findOne({ ...condition, deleted_at: null }, projection).exec()
    }

    async findAll(condition: FilterQuery<T> = {}, options: QueryOptions<T> = {}): Promise<FindAllResponse<T>> {
        const query = { ...condition, deleted_at: null }

        const [count, items] = await Promise.all([
            this.model.countDocuments(query).exec(),
            this.model.find(query, options.projection, options).exec()
        ])

        return { count, items }
    }

    async update(id: string, dto: UpdateQuery<T>): Promise<T | null> {
        return this.model.findOneAndUpdate({ _id: id, deleted_at: null }, dto, { new: true }).exec()
    }

    async updateByCondition(condition: FilterQuery<T>, dto: UpdateQuery<T>): Promise<T | null> {
        return this.model.findOneAndUpdate({ ...condition, deleted_at: null }, dto, { new: true }).exec()
    }

    async softDelete(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true }).exec()
        return !!result
    }

    async permanentlyDelete(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(id).exec()
        return !!result
    }
}
