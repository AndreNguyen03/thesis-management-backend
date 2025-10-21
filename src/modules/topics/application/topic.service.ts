import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { StudentRepositoryInterface } from '../../../users/repository/student.repository.interface'
import {
    CreateErrorException,
    LecturerNotFoundException,
    StudentNotFoundException,
    WrongRoleException
} from '../../../common/exceptions'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { TopicRepositoryInterface, UserSavedTopicRepositoryInterface } from '../repository'
import { CreateTopicDto, GetTopicResponseDto, PatchTopicDto } from '../dtos'
import { plainToInstance } from 'class-transformer'
import { CreateSaveTopicDto } from '../dtos/save/create-save-topic.dtos'
import { RefFieldsTopicsService } from '../../ref_fields_topics/application/ref_fields_topics.service'
import { RefRequirementsTopicsService } from '../../ref_requirements_topics/application/ref_requirements_topics.service'
import { LecturerRegTopicService } from '../../registrations/application/lecturer-reg-topic.service'
import { StudentRegTopicService } from '../../registrations/application/student-reg-topic.service'

@Injectable()
export class TopicService {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepository: TopicRepositoryInterface,
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('UserSavedTopicRepositoryInterface')
        private readonly userSavedTopicRepository: UserSavedTopicRepositoryInterface,
        private readonly refFieldsTopicsService: RefFieldsTopicsService,
        private readonly refRequirementsTopicsService: RefRequirementsTopicsService,
        private readonly lecturerRegTopicService: LecturerRegTopicService,
        private readonly studentRegTopicService: StudentRegTopicService
    ) {}
    public async getRegisteredThesis(user: ActiveUserData) {
        //cancale
    }
    public async getAllTopics(): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.getAllTopics()
    }
    public async createTopic(lecturerId: string, topicData: CreateTopicDto): Promise<GetTopicResponseDto> {
        const { fieldIds, requirementIds, studentIds, lecturerIds, ...newTopic } = topicData
        const existingTopicName = await this.topicRepository.findByTitle(newTopic.title)
        if (existingTopicName) {
            throw new BadRequestException('Đã tồn tại đề tài với tên này.')
        }
        let createdTopic = await this.topicRepository.createTopic(topicData)
        if (!createdTopic) {
            throw new CreateErrorException('đề tài')
        }
        //create ref fields topics
        const fieldNames = await this.refFieldsTopicsService.createWithFieldIds(createdTopic._id.toString(), fieldIds)
        //create ref requirements topics
        let requirementNames: string[] = []
        if (requirementIds && requirementIds.length > 0) {
            requirementNames = await this.refRequirementsTopicsService.createRefRequirementsTopic(
                createdTopic._id,
                requirementIds
            )
        }
        //create ref lecturers topics - to be continue
        let lecturerInCharge: string[] = []
        if (lecturerIds && lecturerIds.length > 0) {
            lecturerInCharge = [...lecturerIds, lecturerId]
        } else {
            lecturerInCharge = [lecturerId]
        }
        let lecturerNames = await this.lecturerRegTopicService.createRegistrationWithLecturers(
            lecturerInCharge,
            createdTopic._id.toString()
        )
        //create ref students topics - to be continue
        let studentNames: string[] = []
        if (studentIds && studentIds.length > 0) {
            studentNames = await this.studentRegTopicService.createRegistrationWithStudents(
                studentIds,
                createdTopic._id.toString()
            )
        }
        //filter output
        return {
            ...createdTopic,
            fieldNames,
            requirementNames,
            lecturerNames,
            studentNames
        }
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
