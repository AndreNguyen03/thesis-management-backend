import { Expose, Transform, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class GetNotificationDto {
    @Expose()
    _id: string
    @Expose()
    title: string
    @Expose()
    message: string
    @Expose()
    type: string
    @Expose()
    isRead: boolean
    @Expose()
    createdAt: Date
    @Expose()
    @Transform(({ obj }) => {
        return obj.metadata
    })
    metadata?: Record<string, any>
}

export class PaginationNotificationDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetNotificationDto)
    data: GetNotificationDto[]
}
