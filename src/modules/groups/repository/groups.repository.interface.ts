import { Injectable } from '@nestjs/common'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { Group, GroupDocument } from '../schemas/groups.schemas'
export interface IGroupRepository extends BaseRepositoryInterface<Group> {
    getGroupsOfUser(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>>
    getGroupDetail(topicId: string): Promise<Group>
    createOrGetDirectGroup(currentUserId: string, targetUserId: string, topicId?: string): Promise<Group>
    getUserDirectGroups(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>>
}
