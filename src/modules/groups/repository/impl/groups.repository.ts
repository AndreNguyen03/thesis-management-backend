import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IGroupRepository } from '../groups.repository.interface'
import mongoose, { Model, Types } from 'mongoose'
import { Group } from '../../schemas/groups.schemas'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Not } from 'typeorm'
import { NotFoundError } from 'rxjs'

export class GroupRepository extends BaseRepositoryAbstract<Group> implements IGroupRepository {
    constructor(
        @InjectModel(Group.name) private readonly groupModel: Model<Group>,
        private readonly pagination: PaginationProvider
    ) {
        super(groupModel)
    }
    //lấy tin nhắn và milestone của cuộc trò chuyện
    async getGroupDetail(topicId: string): Promise<Group> {
        const group = await this.groupModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId)
        })
        if (!group) {
            throw new NotFoundException('Không tìm thấy group')
        }

        return group
    }
    async getGroupsOfUser(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>> {
        let pipeline: any[] = []
        pipeline.push({
            $match: {
                participants: new mongoose.Types.ObjectId(userId)
            }
        })
        return await this.pagination.paginateQuery<Group>(query, this.groupModel, pipeline)
    }
   
}
