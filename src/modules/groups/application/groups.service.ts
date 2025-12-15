import { Inject, Injectable } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'

@Injectable()
export class GroupsService {
    constructor(
        @Inject('IGroupRepository') private readonly groupRepository: IGroupRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider
    ) {}
    async getGroupsOfUser(userId: string, query: PaginationQueryDto) {
        return await this.groupRepository.getGroupsOfUser(userId, query)
    }
    async getGroupDetail(topicId: string) {
        // Logic để lấy chi tiết nhóm của user từ database
        return await this.groupRepository.getGroupDetail(topicId)
    }

}
