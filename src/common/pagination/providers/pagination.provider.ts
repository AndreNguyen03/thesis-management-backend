import { Inject, Injectable } from '@nestjs/common'
// import { REQUEST } from '@nestjs/core'
// import { Document, FilterQuery, Model } from 'mongoose'
// import { PaginationQueryDto } from '../dtos/pagination-query.dto'
// import { Request } from 'express'
// import { Paginated } from '../interface/paginated.interface'

@Injectable()
export class PaginationProvider {
    // /**
    //  * Use Constructor to Inject Request
    //  * */
    // constructor(@Inject(REQUEST) private readonly request: Request) {}
    // public async paginateQuery<T extends Record<string, any>>(
    //     paginationQuery: PaginationQueryDto,
    //     repository: Model<T>
    // ): Promise<Paginated<T>> {
    //     let results = await repository.find({
    //         skip: (paginationQuery.page - 1) * paginationQuery.limit,
    //         take: paginationQuery.limit
    //     })

    //     /**
    //      * Create the request URLs
    //      */
    //     const baseURL = this.request.protocol + '://' + this.request.headers.host + '/'
    //     const newUrl = new URL(this.request.url, baseURL)

    //     // Calculate page numbers
    //     const totalItems = await repository.find({ deleted_at: null }).countDocuments()
    //     const totalPages = Math.ceil(totalItems / paginationQuery.limit)
    //     const nextPage = paginationQuery.page === totalPages ? paginationQuery.page : paginationQuery.page + 1
    //     const previousPage = paginationQuery.page === 1 ? paginationQuery.page : paginationQuery.page - 1

    //     let finalResponse = {
    //         data: results,
    //         meta: {
    //             itemsPerPage: paginationQuery.limit,
    //             totalItems: totalItems,
    //             currentPage: paginationQuery.page,
    //             totalPages: Math.ceil(totalItems / paginationQuery.limit)
    //         },
    //         links: {
    //             first: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=1`,
    //             last: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${totalPages}`,
    //             current: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${paginationQuery.page}`,
    //             next: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${nextPage}`,
    //             previous: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${previousPage}`
    //         }
    //     }

    //     return finalResponse
    // }
}
