import { BadRequestException, Inject, Injectable, NotFoundException, RequestTimeoutException } from '@nestjs/common'
import { StudentRepositoryInterface } from '../../../users/repository/student.repository.interface'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'
import { TopicRepositoryInterface, UserSavedTopicRepositoryInterface } from '../repository'
import {
    CreateTopicDto,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    PaginationTopicsQueryParams,
    PatchTopicDto
} from '../dtos'
import { LecturerRegTopicService } from '../../registrations/application/lecturer-reg-topic.service'
import { StudentRegTopicService } from '../../registrations/application/student-reg-topic.service'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { PhaseHistory, Topic } from '../schemas/topic.schemas'
import { TopicStatus } from '../enum'
import { TranferStatusAndAddPhaseHistoryProvider } from '../providers/tranfer-status-and-add-phase-history.provider'
import { RequestGradeTopicDto } from '../dtos/request-grade-topic.dtos'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { DeleteFileProvider } from '../../upload-files/providers/delete-file.provider'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { PhaseHistoryNote } from '../enum/phase-history-note.enum'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import mongoose from 'mongoose'
import { GetRegistrationInTopicProvider } from '../../registrations/provider/get-registration-in-topic.provider'
import { GetMiniTopicInfoProvider } from '../providers/get-mini-topic-info.provider'
import { NotificationPublisherService } from '../../notifications/publisher/notification.publisher.service'
import { GetFacultyByUserIdProvider } from '../../../users/provider/get-facutly-by-userId.provider'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { GetMiniMiniMajorDto } from '../../majors/dtos/get-major.dto'

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
        private readonly lecturerRegTopicService: LecturerRegTopicService,
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly tranferStatusAndAddPhaseHistoryProvider: TranferStatusAndAddPhaseHistoryProvider,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider,
        private readonly deleteFileProvider: DeleteFileProvider,
        private readonly getRegistrationInTopicProvider: GetRegistrationInTopicProvider,
        private readonly notificationPublisherService: NotificationPublisherService,
        private readonly getMiniTopicInfoProvider: GetMiniTopicInfoProvider,
        private readonly getFacultyByUserIdProvider: GetFacultyByUserIdProvider,
    ) {
        super(topicRepository)
    }
    public async getAllTopics(userId: string): Promise<Paginated<Topic>> {
        return await this.topicRepository.getAllTopics(userId)
    }

    public async getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicResponseDto> {
        const topic = await this.topicRepository.getTopicById(topicId, userId, role)
        if (!topic) {
            throw new NotFoundException('Đề tài không tồn tại.')
        }
        // lấy danh sách sinh viên đăng ký có liên quan
        return await this.mergeTopicWithRelatedInfo(topic)
    }
    private async mergeTopicWithRelatedInfo(topic: GetTopicDetailResponseDto): Promise<GetTopicDetailResponseDto> {
        const res = await this.getRegistrationInTopicProvider.getApprovedAndPendingStudentRegistrationsInTopic(
            topic._id
        )
        return {
            ...topic,
            students: {
                approvedStudents: res ? res.approvedStudents : [],
                pendingStudents: res ? res.pendingStudents : []
            }
        }
    }
    public async createTopic(userId: string, topicData: CreateTopicDto, files: Express.Multer.File[]): Promise<string> {
        const { studentIds, lecturerIds, periodId, ...newTopic } = topicData
        const newPhaseHistory = this.initializePhaseHistory(userId, topicData.currentPhase, topicData.currentStatus)
        topicData.phaseHistories = [newPhaseHistory]

        let topicId
        try {
            topicId = await this.topicRepository.createTopic(topicData)
            // upload files
            if (files && files.length > 0) {
                const idFiles = await this.uploadManyFilesProvider.uploadManyFiles(
                    userId,
                    files,
                    UploadFileTypes.DOCUMENT
                )
                await this.topicRepository.storedFilesIn4ToTopic(topicId, idFiles)
            }
        } catch (error) {
            console.error('Lỗi khi tạo đề tài:', error)
            throw new RequestTimeoutException('Tạo đề tài thất bại, vui lòng thử lại.')
        }
        if (lecturerIds && lecturerIds.length > 0)
            await this.lecturerRegTopicService.createRegistrationWithLecturers(userId, lecturerIds, topicId)

        if (studentIds && studentIds.length > 0) {
            await this.studentRegTopicService.createRegistrationWithStudents(studentIds, topicId)
        }
        return topicId
    }

    public async updateTopic(id: string, topicData: PatchTopicDto, periodId: string) {
        const existingTopicName = await this.topicRepository.findByTitle(
            topicData.titleVN,
            topicData.titleEng,
            periodId
        )
        if (existingTopicName) {
            throw new BadRequestException('Tên đề tài đã tồn tại trong kì này.')
        }
        return this.topicRepository.updateTopic(id, topicData)
    }
    public async deleteTopics(ids: string[], ownerId: string) {
        //xóa đăng ký giảng viên trong đề tài
        const res = await this.topicRepository.deleteTopics(ids, ownerId)
        if (res) {
            await this.lecturerRegTopicService.deleteForceLecturerRegistrationsInTopics(ids)
            await this.studentRegTopicService.deleteForceStudentRegistrationsInTopics(ids)
        }
        return res
    }

    public async getSavedTopics(userId: string, query: PaginationQueryDto): Promise<Paginated<Topic>> {
        const res = await this.topicRepository.findSavedTopicsByUserId(userId, query)
        return res
    }
    public async getDraftTopics(lecturerId: string, query: PaginationQueryDto) {
        return await this.topicRepository.findDraftTopicsByLecturerId(lecturerId, query)
    }
    public async getSubmittedTopics(lecturerId: string, query: PaginationQueryDto) {
        return await this.topicRepository.findSubmittedTopicsByLecturerId(lecturerId, query)
    }
    public async assignSaveTopic(userId: string, topicId: string) {
        return await this.userSavedTopicRepository.assignSaveTopic(userId, topicId)
    }

    public async unassignSaveTopic(userId: string, topicId: string) {
        return await this.userSavedTopicRepository.unassignSaveTopic(userId, topicId)
    }

    public async getRegisteredTopics(userId: string, query: PaginationQueryDto): Promise<Paginated<Topic>> {
        return await this.topicRepository.findRegisteredTopicsByUserId(userId, query)
    }
    public async getCanceledRegisteredTopics(userId: string, userRole: string): Promise<GetTopicResponseDto[]> {
        return await this.topicRepository.findCanceledRegisteredTopicsByUserId(userId, userRole)
    }
    public async submitTopic(topicId: string, actorId: string, periodId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Submitted,
            actorId,
            PhaseHistoryNote.TOPIC_SUBMITTED,
            periodId
        )
    }
    public async approveTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Approved,
            actorId,
            PhaseHistoryNote.TOPIC_APPROVED
        )
        //Gửi thông báo tới giảng viên HD chính createBy
        //đồng thời thông báo cho giảng viên đồng hướng dẫn nữa
        const topicInfor = await this.getMiniTopicInfoProvider.getMiniTopicInfo(topicId)
        //thoogn tin hd chisnh
        const mainSupervisor = await this.lecturerRegTopicService.getMainSupervisorInTopic(topicId)
        const coSupervisors = await this.lecturerRegTopicService.getCoSupervisorsInTopic(topicId)
        const facultyId = await this.getFacultyByUserIdProvider.getFacultyIdByUserId(actorId, UserRole.FACULTY_BOARD)
        await this.notificationPublisherService.sendApprovalTopicNotification(
            mainSupervisor,
            actorId,
            coSupervisors,
            topicInfor,
            facultyId
        )
    }
    public async rejectTopic(topicId: string, actorId: string, facultyNote: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Rejected,
            actorId,
            PhaseHistoryNote.TOPIC_REJECTED + ' với lí do: ' + facultyNote
        )
        const topicInfor = await this.getMiniTopicInfoProvider.getMiniTopicInfo(topicId)
        await this.notificationPublisherService.sendRejectedTopicNotification(topicInfor.createBy, actorId, topicInfor)
    }

    // public async markUnderReviewing(topicId: string, actorId: string) {
    //     await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
    //         topicId,
    //         TopicStatus.UnderReview,
    //         actorId,
    //         PhaseHistoryNote.TOPIC_UNDER_REVIEW
    //     )
    // }
    public async setTopicInProgressing(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.InProgress,
            actorId,
            PhaseHistoryNote.TOPIC_IN_PROGRESS
        )
    }
    // public async markReviewed(topicId: string, actorId: string) {
    //     await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
    //         topicId,
    //         TopicStatus.Reviewed,
    //         actorId
    //     )
    // }

    public async markStudentCompletedProcessing(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.SubmittedForReview,
            actorId,
            PhaseHistoryNote.TOPIC_SUBMITTED_FOR_REVIEW
        )
    }

    public async markDelayedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Delayed,
            actorId,
            PhaseHistoryNote.TOPIC_DELAYED
        )
    }

    public async markPausedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Paused,
            actorId,
            PhaseHistoryNote.TOPIC_PAUSED
        )
    }
    public async setAwaitingEvaluation(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.AwaitingEvaluation,
            actorId,
            PhaseHistoryNote.TOPIC_AWAITING_EVALUATION
        )
    }
    public async scoringBoardScoreTopic(topicId: string, actorId: string, body: RequestGradeTopicDto) {
        //đủ 3 người cùng chấm mới đổi trạng thái sang graded
        const amountGradingPeople = await this.topicRepository.addTopicGrade(topicId, actorId, body)
        if (amountGradingPeople === 3)
            await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                topicId,
                TopicStatus.Graded,
                actorId,
                PhaseHistoryNote.TOPIC_GRADED
            )
    }
    public async archiveTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Archived,
            actorId,
            PhaseHistoryNote.TOPIC_ARCHIVED
        )
    }
    public async scoringBoardRejectTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.RejectedFinal,
            actorId,
            PhaseHistoryNote.TOPIC_REJECTED_FINAL
        )
    }
    public async facultyBoardReviewGradedTopic(topicId: string, actorId: string) {
        await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.Reviewed,
            actorId,
            PhaseHistoryNote.TOPIC_REVIEWED
        )
    }
    private initializePhaseHistory(actorId: string, currentPhase: string, currentStatus: string, note: string = '') {
        const newPhaseHistory = new PhaseHistory()
        newPhaseHistory.phaseName = currentPhase
        newPhaseHistory.status = currentStatus
        newPhaseHistory.actor = actorId
        newPhaseHistory.note = PhaseHistoryNote.LECTURER_INITIATED + ' ' + note
        return newPhaseHistory
    }
    public async addFieldToTopicQuick(topicId: string, fieldId: string, userId: string) {
        const res = await this.topicRepository.addFieldToTopicQuick(topicId, fieldId, userId)
        if (!res) {
            throw new BadRequestException('Không tìm thấy đề tài')
        }
    }
    public async removeFieldFromTopicQuick(topicId: string, fieldId: string, userId: string) {
        const res = await this.topicRepository.removeFieldFromTopicQuick(topicId, fieldId, userId)
        if (!res) {
            throw new BadRequestException('Không tìm thấy đề tài')
        }
    }
    public async addRequirementToTopicQuick(topicId: string, requirementId: string, userId: string) {
        return this.topicRepository.addRequirementToTopicQuick(topicId, requirementId, userId)
    }
    public async removeRequirementFromTopicQuick(topicId: string, requirementId: string, userId: string) {
        const res = await this.topicRepository.removeRequirementFromTopicQuick(topicId, requirementId, userId)
        if (!res) {
            throw new BadRequestException('Không tìm thấy đề tài')
        }
    }
    //service tải file lên đề tài
    public async uploadManyFiles(userId: string, topicId: string, files: Express.Multer.File[]) {
        if (files.length > 20) {
            throw new BadRequestException('Số lượng file tải lên một lần vượt quá giới hạn cho phép (20 file)')
        }
        const idFiles = await this.uploadManyFilesProvider.uploadManyFiles(userId, files, UploadFileTypes.DOCUMENT)
        return this.topicRepository.storedFilesIn4ToTopic(topicId, idFiles)
    }
    public async deleteManyFile(topicId: string, fileIds?: string[]): Promise<number> {
        let neededDeleteFileIds: string[] = []
        if (fileIds && fileIds.length > 0) {
            const topic = await this.findOneByCondition({ _id: topicId, deleted_at: null })
            if (!topic) {
                throw new NotFoundException('Đề tài không tồn tại.')
            }
            neededDeleteFileIds = fileIds && fileIds.length > 0 ? fileIds : topic.fileIds
        }

        await this.deleteFileProvider.deleteMany(neededDeleteFileIds)
        const res: boolean = await this.topicRepository.deleteManyFilesFromTopic(topicId, fileIds)
        if (res) return neededDeleteFileIds.length
        return 0
    }
    public async deleteFile(topicId: string, fileId: string): Promise<number> {
        await this.deleteFileProvider.deleteOne(fileId)
        const res: boolean = await this.topicRepository.deleteFileFromTopic(topicId, fileId)
        if (res) return 1
        return 0
    }
    public async getMetaOptionsForCreate(userId: string) {}
    public async setAllowManualApproval(topicId: string, allowManualApproval: boolean) {
        let topic
        try {
            topic = await this.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
                { allowManualApproval: allowManualApproval }
            )
        } catch (error) {
            throw new RequestTimeoutException('Cập nhật thất bại, vui lòng thử lại.')
        }
        return topic ? true : false
    }
    public async withdrawSubmittedTopics(topicIds: string[], actorId: string) {
        for (const topicId of topicIds)
            await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                topicId,
                TopicStatus.Draft,
                actorId
            )
    }
    public async copyToDraft(topicId: string, actorId: string) {
        const newTopicId = await this.topicRepository.copyToDraft(topicId, actorId)
        //tạo đăng ký cho giảng viên
        await this.lecturerRegTopicService.createSingleRegistration(actorId, newTopicId)
    }
    public async getMajorsOfTopicInLibrary() {
        return await this.topicRepository.getMajorsOfTopicInLibrary()
    }
    public async getYearsOfTopicInLibrary() {
        return await this.topicRepository.getYearsOfTopicInLibrary()
    }
}
