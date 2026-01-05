import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Group, GroupDocument } from '../schemas/groups.schemas'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class GroupsService {
    constructor(@Inject('IGroupRepository') private readonly groupRepository: IGroupRepository) {}
    async getGroupsOfUser(userId: string, query: PaginationQueryDto) {
        return this.groupRepository.getGroupsOfUser(userId, query)
    }

    async getGroupDetail(groupId: string): Promise<Group> {
        const group = await this.groupRepository.getGroupDetail(groupId)

        if (!group) {
            throw new NotFoundException('Không tìm thấy group')
        }
        return group
    }

    async createOrGetDirectGroup(currentUserId: string, targetUserId: string, topicId?: string): Promise<Group> {
        const res = await this.groupRepository.createOrGetDirectGroup(currentUserId, targetUserId, topicId)
        console.log(' create get direct group ::: ', res)
        return res
    }

    async getUserDirectGroups(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>> {
        const res = await this.groupRepository.getUserDirectGroups(userId, query)
        console.log('Get user direct group ::: ', res.data)
        return res
    }
}
