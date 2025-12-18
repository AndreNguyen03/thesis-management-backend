import { Inject, Injectable } from '@nestjs/common'
import { ObjectLiteral } from 'typeorm'
import { Paginated } from '../interfaces/paginated.interface'
import { PaginationQueryDto } from '../dtos/pagination-query.dto'
import { REQUEST } from '@nestjs/core'
import { Request } from 'express'
import * as url from 'url'
import mongoose, { Model } from 'mongoose'
import { isObjectId } from '../utils/validate'

@Injectable()
export class PaginationProvider {
    /**
     * Use Constructor to Inject Request
     * */
    constructor() {
        //  @Inject(REQUEST) private readonly request: Request
    }

    public async paginateQuery<T extends Record<string, any>>(
        paginationQuery: PaginationQueryDto,
        repository: Model<T>,
        pipelineSub?: any[]
    ): Promise<Paginated<T>> {
        const { limit, page, search_by, query, sort_by, sort_order, startDate, endDate, filter, filter_by } =
            paginationQuery
        let queryLimit = limit ?? 10
        let queryPage = page ?? 1

        //basecase

        let pipelineMain: any[] = []

        // --------------------------------------------

        //tìm kiếm trong khoảng thời gian với createdAt
        if (startDate) {
            pipelineMain.push({ $match: { createdAt: { $gte: new Date(startDate) } } })
        }
        if (endDate) {
            pipelineMain.push({ $match: { updatedAt: { $lte: new Date(endDate) } } })
        }
        //tìm kiếm với searchby và query
        if (search_by && query) {
            if (Array.isArray(search_by) && search_by.length > 0) {
                pipelineMain.push({
                    $match: {
                        $or: search_by.map((field) => ({
                            [field]: { $regex: query, $options: 'i' }
                        }))
                    }
                })
            } else {
                if (!Array.isArray(search_by)) {
                    pipelineMain.push({
                        $match: {
                            [search_by]: { $regex: query, $options: 'i' }
                        }
                    })
                }
            }
        }

        //sắp xếp bởi
        pipelineMain.push({
            $sort: { [sort_by!]: sort_order === 'asc' ? 1 : -1 }
        })
        //lọc bởi trường filter_by và với giá trị {filter}
        if (filter_by && filter) {
            // Nếu filter là mảng
            //kiểm tra kiểu của mảng filter

            if (isObjectId(filter[0])) {
                pipelineMain.push({
                    $match: {
                        [filter_by]: { $in: filter.map((id) => new mongoose.Types.ObjectId(id)) }
                    }
                })
            } else {
                pipelineMain.push({
                    $match: {
                        [filter_by]: { $in: filter }
                    }
                })
            }
        }

        //facet
        pipelineMain.push({
            $facet: {
                data: [
                    { $match: { deleted_at: null } },
                    {
                        $skip: (queryPage - 1) * queryLimit
                    },
                    ...(queryLimit > 0 ? [{ $limit: queryLimit }] : [])
                ],
                totalCount: [{ $count: 'count' }]
            }
        })
        //add sub pipeline nếu có từ bên ngoài truyền vào
        if (pipelineSub && pipelineSub.length > 0) {
            pipelineMain = [...pipelineSub, ...pipelineMain]
        }
        let aggregationResult: T[]
        try {
            aggregationResult = await repository.aggregate(pipelineMain).exec()
        } catch (error) {
            console.error('Aggregation error:', error)
            throw error
        }

        //handle response
        const results = aggregationResult[0].data as T[]
        const totalItems = aggregationResult[0].totalCount[0]?.count || 0
        // Calculate page numbers
        const totalPages = queryLimit > 0 ? Math.ceil(totalItems / queryLimit) : 1

        const nextPage = queryPage === totalPages ? queryPage : queryPage + 1
        const previousPage = queryPage === 1 ? queryPage : queryPage - 1

        let finalResponse = {
            data: results,
            meta: {
                itemsPerPage: queryLimit,
                totalItems: totalItems,
                currentPage: queryPage,
                totalPages: totalPages
            }
            // links: {
            //     first: 1,
            //     last: totalPages,
            //     current: queryPage,
            //     next: nextPage,
            //     previous: previousPage
            // }
        }

        return finalResponse
    }
}
