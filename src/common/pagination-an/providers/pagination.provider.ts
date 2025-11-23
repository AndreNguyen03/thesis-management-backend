import { Inject, Injectable } from '@nestjs/common'
import { ObjectLiteral } from 'typeorm'
import { Paginated } from '../interfaces/paginated.interface'
import { PaginationQueryDto } from '../dtos/pagination-query.dto'
import { REQUEST } from '@nestjs/core'
import { Request } from 'express'
import * as url from 'url'
import { Model } from 'mongoose'

@Injectable()
export class PaginationProvider {
    constructor(@Inject(REQUEST) private readonly request?: Request) {}

    public async paginateQuery<T extends Record<string, any>>(
        paginationQuery: PaginationQueryDto,
        repository: Model<T>,
        pipelineSub?: any[]
    ): Promise<Paginated<T>> {
        const { limit, page, search_by, query, sort_by, sort_order, startDate, endDate } = paginationQuery
        const queryLimit = limit ?? 10
        const queryPage = page ?? 1

        let pipelineMain: any[] = []

        // Add sub pipeline nếu có
        if (pipelineSub?.length) {
            pipelineMain.push(...pipelineSub)
        }

        // Base match
        pipelineMain.push({ $match: { deleted_at: null } })

        // Search by query
        if (search_by && query) {
            pipelineMain.push({
                $match: { [search_by]: { $regex: query, $options: 'i' } }
            })
        }

        // Time filter
        if (startDate) pipelineMain.push({ $match: { createdAt: { $gte: new Date(startDate) } } })
        if (endDate) pipelineMain.push({ $match: { updatedAt: { $lte: new Date(endDate) } } })

        // Sort
        if (sort_by) {
            pipelineMain.push({ $sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 } })
        }

        // Pagination
        const skip = (queryPage - 1) * queryLimit
        pipelineMain.push({ $skip: skip }, { $limit: queryLimit })

        // Execute aggregation
        const results = await repository.aggregate(pipelineMain).exec()
        const totalItems = await repository.countDocuments({ deleted_at: null })
        const totalPages = Math.ceil(totalItems / queryLimit)

        // Return paginated data (links sẽ tạo ở controller nếu cần)
        return {
            data: results,
            meta: {
                itemsPerPage: queryLimit,
                totalItems,
                currentPage: queryPage,
                totalPages
            },
            totalRecords: totalItems
        }
    }
}
