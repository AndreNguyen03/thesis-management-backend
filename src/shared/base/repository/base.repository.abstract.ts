import mongoose, { FilterQuery, HydratedDocument, Model, QueryOptions } from 'mongoose'
import { BaseEntity } from '../entity/base.entity'
import { BaseRepositoryInterface } from './base.repository.interface'
import { Paginated } from '../../../common/pagination/interface/paginated.interface'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'
import { Req, RequestTimeoutException } from '@nestjs/common'

export abstract class BaseRepositoryAbstract<T extends BaseEntity> implements BaseRepositoryInterface<T> {
    constructor(private readonly model: Model<T>) {
        this.model = model
    }
    async findOneAndUpdate(condition: object, dto: Partial<T>): Promise<T | null> {
       return  await this.model.findOneAndUpdate({ ...condition, deleted_at: null }, dto, { new: true })
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

    async findAll(condition: FilterQuery<T>, options?: QueryOptions<T>): Promise<Paginated<T>> {
        const [count, items] = await Promise.all([
            this.model.countDocuments({ ...condition, deleted_at: null }),
            this.model.find({ ...condition, deleted_at: null }, options?.projection, options)
        ])
        return {
            totalRecords: count,
            datas: items
        }
    }

    async paginate(
        condition: object,
        paginationQuery: PaginationQueryDto,
        populate?: string | string[] | any[]
    ): Promise<Paginated<T>> {
        const { page = 1, page_size = 10, search_by, query, sort_by, sort_order } = paginationQuery

        // ✅ Build điều kiện lọc
        const filter: any = { ...condition, deleted_at: null }
        if (search_by && query) {
            filter[search_by] = { $regex: query, $options: 'i' }
        }

        // ✅ Build sort
        const sort: Record<string, 1 | -1> = {}
        if (sort_by) sort[sort_by] = sort_order === 'desc' ? -1 : 1
        else sort['createdAt'] = -1

        const skip = (page - 1) * page_size

        // ✅ Build query
        let queryBuilder = this.model.find(filter).sort(sort).skip(skip).limit(page_size)

        // ✅ Linh hoạt populate
        if (populate) {
            if (Array.isArray(populate)) {
                populate.forEach((p) => {
                    queryBuilder = queryBuilder.populate(p)
                })
            } else {
                queryBuilder = queryBuilder.populate(populate)
            }
        }

        const [totalRecords, datas] = await Promise.all([this.model.countDocuments(filter), queryBuilder.lean()])

        return { totalRecords, datas: datas as unknown as T[] }
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
