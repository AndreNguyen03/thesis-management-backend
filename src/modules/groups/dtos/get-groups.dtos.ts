import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class LastMessageDTO {
    @Expose()
    content: string

    @Expose()
    senderId: string

    @Expose()
    fullName?: string

    @Expose()
    createdAt: Date
}

export class ParticipantDTO {
    @Expose()
    id: string

    @Expose()
    fullName: string

    @Expose()
    avatarUrl?: string
}

export class RequestPaginatedGroups extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GroupSidebarDTO)
    data: GroupSidebarDTO[]
}

export class GroupDetailDto {
    @Expose()
    id: string

    @Expose()
    topicId: string

    @Expose()
    type: 'direct' | 'group'

    @Expose()
    @Type(() => ParticipantDTO)
    participants: ParticipantDTO[]

    @Expose()
    @Type(() => LastMessageDTO)
    lastMessage?: LastMessageDTO

    @Expose()
    unreadCounts?: Record<string, number>

    @Expose()
    lastSeenAtByUser?: Record<string, string | null>

    @Expose() 
    isAbleGoToDefense: boolean
}

export class GroupSidebarDTO {
    @Expose()
    _id: string

    @Expose()
    titleVN: string

    @Expose()
    topicId: string

    @Expose()
    topicType: string

    @Expose()
    type: string

    @Expose()
    @Type(() => ParticipantDTO)
    participants: ParticipantDTO[]

    @Expose()
    @Type(() => LastMessageDTO)
    lastMessage?: LastMessageDTO

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date

    @Expose()
    unreadCounts?: Record<string, number>

    @Expose()
    lastSeenAtByUser?: Record<string, Date>

    @Expose()
    isAbleGotoDefense: boolean
}
