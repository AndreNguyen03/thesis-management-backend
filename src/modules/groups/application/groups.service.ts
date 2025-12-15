import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { GroupResponseDto } from '../dtos/get-groups.dtos'

@Injectable()
export class GroupsService {
    constructor(
        @Inject('IGroupRepository') private readonly groupRepository: IGroupRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider
    ) {}
    async getGroupsOfUser(userId: string, query: PaginationQueryDto) {
        return await this.groupRepository.getGroupsOfUser(userId, query)
    }
    // group.service.ts

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

}
