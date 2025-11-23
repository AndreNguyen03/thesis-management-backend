import mongoose, { FilterQuery, HydratedDocument, Model, QueryOptions } from 'mongoose'
import { BaseEntity } from '../entity/base.entity'
import { BaseRepositoryInterface } from './base.repository.interface'
import { Req, RequestTimeoutException } from '@nestjs/common'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

export abstract class BaseRepositoryAbstract<T extends BaseEntity> implements BaseRepositoryInterface<T> {
    constructor(private readonly model: Model<T>) {
        this.model = model
    }
    async findOneAndUpdate(condition: object, dto: Partial<T>): Promise<T | null> {
        return await this.model.findOneAndUpdate({ ...condition, deleted_at: null }, dto, { new: true })
    }

    async create(dto: T | any): Promise<T> {
        const created_data = await this.model.create(dto)
        return created_data.toObject() as T
    }

    async getAll(): Promise<T[]> {
        return this.model.find({ deleted_at: null }).exec()
    }

    async findOneById(id: string): Promise<T | null> {
        try {
            const item = await this.model.findOne({ _id: id, deleted_at: null }).exec()
            if (!item) return null
            return item.deleted_at ? null : item
        } catch (error) {
            throw new RequestTimeoutException()
        }
    }

    async checkExistsById(id: string): Promise<boolean> {
        try {
            const item = await this.model.findOne({ _id: id }).exec()
            if (!item) return false
            return item.deleted_at ? false : true
        } catch (error) {
            throw new RequestTimeoutException()
        }
    }

    async findOneByCondition(condition = {}): Promise<T | null> {
        return await this.model
            .findOne({
                ...condition
            })
            .exec()
    }
    async findByCondition(condition = {}, projection?: string): Promise<T[] | null> {
        return await this.model
            .find(
                {
                    ...condition
                },
                projection
            )
            .exec()
    }


    async update(id: string, dto: Partial<T>): Promise<T | null> {
        return await this.model.findOneAndUpdate({ _id: id, deleted_at: null }, dto, { new: true })
    }

    async softDelete(id: string): Promise<boolean> {
        const delete_item = await this.model.findById(id)
        if (!delete_item) {
            return false
        }

        return !!(await this.model.findByIdAndUpdate<T>(id, { deleted_at: new Date() }).exec())
    }

    async permanentlyDelete(id: string): Promise<boolean> {
        const delete_item = await this.model.findById(id)
        if (!delete_item) {
            return false
        }
        return !!(await this.model.findByIdAndDelete(id))
    }
}
