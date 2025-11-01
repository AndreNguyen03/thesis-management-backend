import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { CreateTopicDto, GetTopicResponseDto, PatchTopicDto, ReplyRegistrationDto } from '../dtos'
import { StudentRepositoryInterface } from '../../users/repository/student.repository.interface'
import { LecturerNotFoundException, StudentNotFoundException, WrongRoleException } from '../../common/exceptions'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { LecturerRepositoryInterface } from '../../users/repository/lecturer.repository.interface'
import { UserRole } from '../../auth/enum/user-role.enum'
import { ArchiveRepositoryInterface, RegistrationRepositoryInterface, TopicRepositoryInterface } from '../repository'
import { UpdateTopicDto } from '../dtos/topic.dtos'
import { Types } from 'mongoose'
import { Topic } from '../schemas/topic.schemas'
import { convertDtoIdsToObjectId } from '../utils/utils'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'

@Injectable()
export class TopicService extends BaseServiceAbstract<Topic>{
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly TopicRepository: TopicRepositoryInterface,
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface,
        @Inject('RegistrationRepositoryInterface')
        private readonly registrationRepository: RegistrationRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('ArchiveRepositoryInterface')
        private readonly archiveRepository: ArchiveRepositoryInterface
    ) {
        super(TopicRepository)
    }
    
    public async getRegisteredTopic(user: ActiveUserData) {
        await this._validateUser(user.sub, user.role)
        return this.registrationRepository.getTopicRegistrationsByUser(user.sub, user.role)
    }
    public async getAllTopic(userId: string, role: string) {
        return this.TopicRepository.getAllTheses(userId, role)
    }
    public async createTopic(topicData: CreateTopicDto) {
        return this.create(topicData)
    }
    public async updateTopic(id: string, topicData: UpdateTopicDto) {
        const updateData = convertDtoIdsToObjectId(topicData, [
            'departmentId',
            'majorId',
            'coAdvisorIds'
        ]) as Partial<Topic>
        return this.TopicRepository.update(id, updateData)
    }
    public async deleteTopic(id: string) {
        // const Topic = await this.TopicRepository.findOneById(id)
        // if (!Topic) {
        //     throw new NotFoundException('Topic not found')
        // }
        // if (Topic.deleted_at) {
        //     throw new Error('Topic already deleted')
        // }
        // return this.TopicRepository.permanentlyDelete(id)
    }
    public async registerForTopic(userId: string, TopicId: string, role: string) {
        await this._validateUser(userId, role)

        return this.registrationRepository.createRegistration(TopicId, userId, role)
    }

    public async cancelRegistration(userId: string, TopicId: string, role: string) {
        await this._validateUser(userId, role)
        return this.registrationRepository.deleteRegistration(TopicId, userId, role)
    }

    public async getSavedTopic(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        await this._validateUser(userId, role)

        return await this.archiveRepository.findSavedThesesByUserId(userId, role)
    }
    public async saveTopic(userId: string, role: string, TopicId: string) {
        await this._validateUser(userId, role)
        return await this.archiveRepository.archiveTopic(userId, role, TopicId)
    }

    public async unarchiveTopic(userId: string, TopicId: string, role: string) {
        await this._validateUser(userId, role)
        return await this.archiveRepository.unarchiveTopic(userId, TopicId, role)
    }

    async getCanceledRegistrations(userId: string, role: string) {
        await this._validateUser(userId, role)
        return this.registrationRepository.getCanceledRegistrationByUser(userId, role)
    }

    private async _validateUser(userId: string, role: string) {
        if (role === UserRole.STUDENT) {
            const user = await this.studentRepository.findOneById(userId)
            if (!user) {
                throw new StudentNotFoundException()
            }
            return user
        } else if (role === UserRole.LECTURER) {
            const user = await this.lecturerRepository.findOneById(userId)
            if (!user) {
                throw new LecturerNotFoundException()
            }
            return user
        }
        throw new WrongRoleException('Vai trò không hợp lệ.')
    }
}
