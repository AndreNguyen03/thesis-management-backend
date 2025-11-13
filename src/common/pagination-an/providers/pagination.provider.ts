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
    /**
     * Use Constructor to Inject Request
     * */
    constructor(@Inject(REQUEST) private readonly request: Request) {}

    public async paginateQuery<T extends Record<string, any>>(
        paginationQuery: PaginationQueryDto,
        repository: Model<T>,
        pipelineSub?: any[]
    ): Promise<Paginated<T>> {
        let queryLimit = paginationQuery.limit ?? 10
        let queryPage = paginationQuery.page ?? 1

        //basecase
        let pipelineMain: any[] = []
        pipelineMain.push(
            ...[
                { $match: { deleted_at: null } },
                {
                    $skip: (queryPage - 1) * queryLimit
                },
                {
                    $limit: queryLimit
                }
            ]
        )

        if (pipelineSub && pipelineSub.length > 0) {
            pipelineMain = [...pipelineSub, ...pipelineMain]
        }
        
        let results: T[]
        try {
            results = await repository.aggregate(pipelineMain).exec()
        } catch (error) {
            console.error('Aggregation error:', error)
            throw error
        }

        /**
         * Create the request URLs
         */
        const baseURL = this.request.protocol + '://' + this.request.headers.host + '/'
        const newUrl = new URL(this.request.url, baseURL)

        // Calculate page numbers
        const totalItems = await repository.find({ deleted_at: null }).countDocuments()
        const totalPages = Math.ceil(totalItems / queryLimit)
        const nextPage = queryPage === totalPages ? queryPage : queryPage + 1
        const previousPage = queryPage === 1 ? queryPage : queryPage - 1

        let finalResponse = {
            data: results,
            meta: {
                itemsPerPage: queryLimit,
                totalItems: totalItems,
                currentPage: queryPage,
                totalPages: Math.ceil(totalItems / queryLimit)
            },
            links: {
                first: `${newUrl.origin}${newUrl.pathname}?limit=${queryLimit}&page=1`,
                last: `${newUrl.origin}${newUrl.pathname}?limit=${queryLimit}&page=${totalPages}`,
                current: `${newUrl.origin}${newUrl.pathname}?limit=${queryLimit}&page=${queryPage}`,
                next: `${newUrl.origin}${newUrl.pathname}?limit=${queryLimit}&page=${nextPage}`,
                previous: `${newUrl.origin}${newUrl.pathname}?limit=${queryLimit}&page=${previousPage}`
            }
        }

        return finalResponse
    }
}
