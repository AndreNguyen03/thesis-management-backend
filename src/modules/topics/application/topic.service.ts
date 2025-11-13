import { BadRequestException, Inject, Injectable, NotFoundException, RequestTimeoutException } from '@nestjs/common'
import { StudentRepositoryInterface } from '../../../users/repository/student.repository.interface'
import { CreateErrorException, TopicNotFoundException } from '../../../common/exceptions'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { TopicRepositoryInterface, UserSavedTopicRepositoryInterface } from '../repository'
import { CreateTopicDto, GetTopicResponseDto, PatchTopicDto, RequestGetTopicsInPeriodDto } from '../dtos'
import { RefFieldsTopicsService } from '../../ref_fields_topics/application/ref_fields_topics.service'
import { RefRequirementsTopicsService } from '../../ref_requirements_topics/application/ref_requirements_topics.service'
import { LecturerRegTopicService } from '../../registrations/application/lecturer-reg-topic.service'
import { StudentRegTopicService } from '../../registrations/application/student-reg-topic.service'
import { extend } from 'joi'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { PhaseHistory, Topic } from '../schemas/topic.schemas'
import { TopicStatus } from '../enum'
import mongoose from 'mongoose'
import { TranferStatusAndAddPhaseHistoryProvider } from '../providers/tranfer-status-and-add-phase-history.provider'
import { RequestGradeTopicDto } from '../dtos/request-grade-topic.dtos'

@Injectable()
export class TopicService extends BaseServiceAbstract<Topic> {
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
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly tranferStatusAndAddPhaseHistoryProvider: TranferStatusAndAddPhaseHistoryProvider
    ) {
        super(topicRepository)
    }

    public async getAllTopics(userId: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.getAllTopics(userId)
    }
    public async getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicResponseDto> {
        const topic = await this.topicRepository.getTopicById(topicId, userId, role)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại.')
        }
        return topic
    }
    public async createTopic(lecturerId: string, topicData: CreateTopicDto): Promise<string> {
        const { fieldIds, requirementIds, studentIds, lecturerIds, ...newTopic } = topicData
        const existingTopicName = await this.topicRepository.findByTitle(newTopic.title)
        if (existingTopicName) {
            throw new BadRequestException('Tên đề tài đã tồn tại.')
        }

        //create phase history
        const newPhaseHistory = this.createPhaseHistory(lecturerId, topicData)
        topicData.phaseHistories = [newPhaseHistory]
        let topicId
        try {
            topicId = await this.topicRepository.createTopic(topicData)
        } catch (error) {
            throw new RequestTimeoutException('Tạo đề tài thất bại, vui lòng thử lại.')
        }

        //create ref fields topics
        const fieldNames = await this.refFieldsTopicsService.createWithFieldIds(topicId, fieldIds)
        //create ref requirements topics
        let requirementNames: string[] = []
        if (requirementIds && requirementIds.length > 0) {
            requirementNames = await this.refRequirementsTopicsService.createRefRequirementsTopic(
                topicId,
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
        await this.lecturerRegTopicService.createRegistrationWithLecturers(lecturerInCharge, topicId)
        //create ref students topics - to be continue
        if (studentIds && studentIds.length > 0) {
            await this.studentRegTopicService.createRegistrationWithStudents(studentIds, topicId)
        }
        return topicId
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
    public async getCanceledRegisteredTopics(userId: string, userRole: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.findCanceledRegisteredTopicsByUserId(userId, userRole)
    }
    public async submitTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Submitted,
            actorId
        )
    }
    public async approveTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Approved,
            actorId
        )
    }
    public async rejectTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Rejected,
            actorId
        )
    }

    public async markUnderReviewing(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.UnderReview,
            actorId
        )
    }
    public async setTopicInProgressing(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.InProgress,
            actorId
        )
    }
    public async markReviewed(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Reviewed,
            actorId
        )
    }

    public async markStudentCompletedProcessing(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.SubmittedForReview,
            actorId
        )
    }

    public async markDelayedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Delayed,
            actorId
        )
    }

    public async markPausedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Paused,
            actorId
        )
    }
    public async setAwaitingEvaluation(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.AwaitingEvaluation,
            actorId
        )
    }
    public async topicScoring(topicId: string, actorId: string, body: RequestGradeTopicDto) {
        //đủ 3 người cùng chấm mới đổi trạng thái sang graded
        const amountGradingPeople = await this.topicRepository.addTopicGrade(topicId, actorId, body)
        if (amountGradingPeople === 3)
            await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                topicId,
                TopicStatus.Graded,
                actorId
            )
    }
    public async archiveTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Archived,
            actorId
        )
    }
    public async scoringBoardRejectTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.RejectedFinal,
            actorId
        )
    }
    public async facultyBoardReviewGradedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Reviewed,
            actorId
        )
    }
    private createPhaseHistory(actorId: string, topicData: CreateTopicDto) {
        const newPhaseHistory = new PhaseHistory()
        newPhaseHistory.phaseName = topicData.currentPhase
        newPhaseHistory.status = topicData.currentStatus
        newPhaseHistory.actorId = actorId
        return newPhaseHistory
    }
}
