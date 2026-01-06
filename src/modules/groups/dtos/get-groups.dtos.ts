import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { Types } from 'mongoose'

/* =======================
 * Last Message
 * ======================= */
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

/* =======================
 * Participant (Base)
 * ======================= */
export class BaseParticipantDTO {
    @Expose()
    _id: string

    @Expose()
    fullName: string

    @Expose()
    avatarUrl?: string

    @Expose()
    role: 'student' | 'lecturer'
}

/* =======================
 * Student Participant
 * ======================= */
export class StudentParticipantDTO extends BaseParticipantDTO {
    @Expose()
    declare role: 'student'

    @Expose()
    studentCode: string
}

/* =======================
 * Lecturer Participant
 * ======================= */
export class LecturerParticipantDTO extends BaseParticipantDTO {
    @Expose()
    declare role: 'lecturer'

    @Expose()
    title: string
}

/* =======================
 * Union type (for TS only)
 * ======================= */
export type ParticipantDTO = StudentParticipantDTO | LecturerParticipantDTO

/* =======================
 * Group Detail
 * ======================= */
export class GroupDetailDto {
    @Expose()
    id: string

    @Expose()
    topicId: string

    @Expose()
    type: 'direct' | 'group'

    @Expose()
    @Type(() => BaseParticipantDTO)
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

    @Expose()
    topicTitleVN: string

    @Expose()
    topicTitleEng: string
    @Expose()
    topicStatus: string
}

/* =======================
 * Sidebar Item
 * ======================= */
export class GroupSidebarDTO {
    @Expose()
    _id: string

    @Expose()
    titleVN: string | null

    @Expose()
    topicId: string

    @Expose()
    topicType: string | null

    @Expose()
    type: 'direct' | 'group'

    @Expose()
    @Type(() => BaseParticipantDTO)
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

/* =======================
 * Paginated Response
 * ======================= */
export class RequestPaginatedGroups extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GroupSidebarDTO)
    data: GroupSidebarDTO[]
}

export class MessageDto {
    @Expose()
    _id: string
    @Expose()
    groupId: string
    @Expose()
    senderId: {
        _id: string
        fullName: string
        avatarUrl: string
    }
    @Expose()
    content: string
    @Expose()
    type: 'text' | 'file' | 'image'
    @Expose()
    attachments?: string[]
    @Expose()
    replyTo?: string | null
    @Expose()
    createdAt: string
    @Expose()
    status?: 'sending' | 'sent' | 'delivered' | 'seen'
}

export interface LeanPopulatedMessage {
    _id: Types.ObjectId
    groupId: Types.ObjectId
    content: string
    type: 'text' | 'file' | 'image'
    attachments?: string[]
    replyTo?: Types.ObjectId | null
    createdAt: Date
    senderId: {
        _id: Types.ObjectId
        fullName: string
        avatarUrl: string
    }
}
