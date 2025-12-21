import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { GroupResponseDto } from '../dtos/get-groups.dtos'
import { Group, GroupDocument } from '../schemas/groups.schemas'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class GroupsService {
    constructor(
        @Inject('IGroupRepository') private readonly groupRepository: IGroupRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider
    ) {}
    async getGroupsOfUser(userId: string, query: PaginationQueryDto) {
        return await this.groupRepository.getGroupsOfUser(userId, query)
    }

    async getGroupDetail(groupId: string): Promise<GroupResponseDto> {
        const group = await this.groupRepository.getGroupDetail(groupId)

        if (!group) {
            throw new NotFoundException('Không tìm thấy group')
        }

        return {
            id: group._id.toString(),
            topicId: group.topicId.toString(),
            type: group.type as 'direct' | 'group',
            participants: group.participants.map((u: any) => ({
                id: u._id.toString(),
                fullName: u.fullName,
                avatarUrl: u.avatarUrl
            })),
            lastMessage: group.lastMessage
                ? {
                      content: group.lastMessage.content,
                      senderId: group.lastMessage.senderId.toString(),
                      createdAt: group.lastMessage.createdAt
                  }
                : undefined,
            unreadCounts: Object.fromEntries(group.unreadCounts ?? []),
            lastSeenAtByUser: group.lastSeenAtByUser
                ? Object.fromEntries(
                      Array.from(group.lastSeenAtByUser.entries()).map(([uid, date]) => [
                          uid,
                          date ? date.toISOString() : null
                      ])
                  )
                : {}
        }
    }

    async createOrGetDirectGroup(currentUserId: string, targetUserId: string, topicId?: string): Promise<Group> {
        const res = await this.groupRepository.createOrGetDirectGroup(currentUserId, targetUserId, topicId)
        console.log(' create get direct group ::: ', res)
        return  res
    }

    async getUserDirectGroups(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>> {
        const res = await this.groupRepository.getUserDirectGroups(userId, query)
        console.log('Get user direct group ::: ', res.data)
        return res
    }
}
