import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { StudentRepositoryInterface } from '../../../users/repository/student.repository.interface'
import { LecturerNotFoundException, StudentNotFoundException, WrongRoleException } from '../../../common/exceptions'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'
import { UserRole } from '../../../auth/enum/user-role.enum'
import {
    StudentRegTopicRepositoryInterface,
    TopicRepositoryInterface,
    UserSavedTopicRepositoryInterface
} from '../repository'
import { CreateTopicDto, GetTopicResponseDto, PatchTopicDto } from '../dtos'
import { plainToInstance } from 'class-transformer'
import { CreateSaveTopicDto } from '../dtos/save/create-save-topic.dtos'

@Injectable()
export class TopicService {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepository: TopicRepositoryInterface,
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface,
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly registrationRepository: StudentRegTopicRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('UserSavedTopicRepositoryInterface')
        private readonly userSavedTopicRepository: UserSavedTopicRepositoryInterface
    ) {}
    public async getRegisteredThesis(user: ActiveUserData) {
        //cancale
    }
    public async getAllTopics(userId: string, role: string) {
        return this.topicRepository.getAllTopics(userId, role)
    }
    public async createTopic(topicData: CreateTopicDto) {
        return this.topicRepository.create(topicData)
    }
    public async updateTopic(id: string, topicData: PatchTopicDto) {
        return this.topicRepository.update(id, topicData)
    }
    public async deleteThesis(id: string) {
        let deleteTopic = this.topicRepository.softDelete(id)
        if (!deleteTopic) {
            throw new BadRequestException('Đề tài không tồn tại hoặc đã bị xóa.')
        }
        return 'Xóa đề tài thành công'
    }
    public async registerForThesis(userId: string, thesisId: string, role: string) {
        //cancale
    }

    public async cancelRegistration(userId: string, thesisId: string, role: string) {
        //cancale
    }

    public async getSavedTopics(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        //  await this._validateUser(userId, role)

        return await this.userSavedTopicRepository.findSavedTopicsByUserId(userId)
    }
    public async saveTopic(userId: string, thesisId: string) {
        const saveTopicDto = plainToInstance(CreateSaveTopicDto, { userId, thesisId })
        return await this.userSavedTopicRepository.create(saveTopicDto)
    }

    public async unSaveTopic(userId: string, topicId: string) {
        return await this.userSavedTopicRepository.unsaveTopic(userId, topicId)
    }

    async getCanceledRegistrations(userId: string, role: string) {
        //cancale
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
