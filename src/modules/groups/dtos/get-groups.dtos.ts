import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

class LastMessage {
    @Expose()
    content: string
    @Expose()
    senderId: string
    @Expose()
    createdAt: Date
}
export class GetGroupsDto {
    @Expose()
    topicId: string
    @Expose()
    type: string
    @Expose()
    participants: string[]
    @Expose()
    @Type(() => LastMessage)
    lastMessage: LastMessage
    @Expose()
    @Type(() => Map<string, Number>)
    unreadCounts: Map<string, number>
}

export class RequestPaginatedGroups extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetGroupsDto)
    data: GetGroupsDto[]
}
