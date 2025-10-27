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

    public async getAllTopics(userId: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.getAllTopics(userId)
    }
    public async getTopicById(topicId: string, userId: string,role:string): Promise<GetTopicResponseDto> {
        const topic = await this.topicRepository.getTopicById(topicId, userId,role)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại.')
        }
        return topic
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
            fieldNames: fieldNames,
            requirementNames: requirementNames,
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

    public async getSavedTopics(userId: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.findSavedTopicsByUserId(userId)
    }

    public async assignSaveTopic(userId: string, topicId: string) {
        return await this.userSavedTopicRepository.assignSaveTopic(userId, topicId)
    }

    public async unassignSaveTopic(userId: string, topicId: string) {
        return await this.userSavedTopicRepository.unassignSaveTopic(userId, topicId)
    }

    public async getRegisteredTopics(userId: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.findRegisteredTopicsByUserId(userId)
    }
    public async getCanceledRegisteredTopics(userId: string,userRole:string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.findCanceledRegisteredTopicsByUserId(userId,userRole)
    }
}
