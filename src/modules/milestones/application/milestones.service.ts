import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { IMilestoneRepository } from '../repository/miletones.repository.interface'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    PayloadUpdateMilestone,
    RequestLecturerReview,
    ManageTopicsInDefenseMilestoneDto,
    ManageLecturersInDefenseMilestoneDto
} from '../dtos/request-milestone.dto'
import { GetTopicsInDefenseMilestoneQuery } from '../dtos/request-defense-topics.dto'
import { BulkArchiveTopicsDto, GetTopicsForArchiveQuery } from '../dtos/archive-topics.dto'
import type { Response } from 'express'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { FileInfo } from '../schemas/milestones.schemas'
import { TasksService } from '../../todolists/application/tasks.service'
import { RequestCreate } from '../../todolists/dtos/request-update.dtos'
import { GetGroupProvider } from '../../groups/provider/get-group.provider'
import mongoose from 'mongoose'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { DownLoadFileProvider } from '../../upload-files/providers/download-file.provider'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { PaginationAllDefenseMilestonesQuery } from '../dtos/query-params.dto'
import { PeriodsService } from '../../periods/application/periods.service'
import { InjectModel } from '@nestjs/mongoose'
import { Topic } from '../../topics/schemas/topic.schemas'
import { Model } from 'mongoose'
import { DefenseCouncil } from '../schemas/defense-council.schema'
import { StudentRegisterTopic } from '../../registrations/schemas/ref_students_topics.schemas'
import { LecturerRegisterTopic } from '../../registrations/schemas/ref_lecturers_topics.schemas'
import { TranferStatusAndAddPhaseHistoryProvider } from '../../topics/providers/tranfer-status-and-add-phase-history.provider'
import { TopicStatus } from '../../topics/enum'
import { MilestoneTemplate } from '../schemas/milestones-templates.schema'

@Injectable()
export class MilestonesService {
    constructor(
        @Inject('IMilestoneRepository') private readonly milestoneRepository: IMilestoneRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider,
        private readonly taskService: TasksService,
        private readonly getGroupProvider: GetGroupProvider,
        private readonly downLoadFileProvider: DownLoadFileProvider,
        @Inject(forwardRef(() => PeriodsService))
        private readonly periodsService: PeriodsService,
        @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
        @InjectModel(DefenseCouncil.name) private readonly defenseCouncilModel: Model<DefenseCouncil>,
        @InjectModel(StudentRegisterTopic.name) private readonly studentRegisterTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(LecturerRegisterTopic.name)
        private readonly lecturerRegisterTopicModel: Model<LecturerRegisterTopic>,
        @InjectModel(MilestoneTemplate.name) private readonly milestoneTemplateModel: Model<MilestoneTemplate>,
        private readonly tranferStatusAndAddPhaseHistoryProvider: TranferStatusAndAddPhaseHistoryProvider
    ) {}

    async getAllMilestones(userId: string): Promise<any> {
        return await this.milestoneRepository.getAllMilestones(userId)
    }

    async reviewMilestone(milestoneId: string, lecturerId: string, body: RequestLecturerReview) {
        return await this.milestoneRepository.reviewMilestone(milestoneId, lecturerId, body)
    }
    async getMilestonesOfGroup(groupId: string, role: string) {
        return await this.milestoneRepository.getMilestonesOfGroup(groupId, role)
    }
    async createMilestone(body: PayloadCreateMilestone, user: ActiveUserData) {
        return await this.milestoneRepository.createMilestone(body, user)
    }
    async facultyCreate(user: ActiveUserData, body: PayloadFacultyCreateMilestone) {
        const groupIds = await this.getGroupProvider.getGroupIdsByPeriodId(body.periodId, body.phaseName)
        return await this.milestoneRepository.facultyCreateMilestone(body, user, groupIds)
    }
    async updateMilestone(milestoneId: string, body: PayloadUpdateMilestone) {
        return await this.milestoneRepository.updateMilestone(milestoneId, body)
    }
    async updateActiveState(milestoneId: string, isActive: boolean) {
        return await this.milestoneRepository.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(milestoneId), deleted_at: null },
            { isActive: isActive }
        )
    }
    async submitReport(files: Express.Multer.File[], milestoneId: string, userId: string) {
        //tạo folderName
        //const folderName = await this.milestoneRepository.getTopicNameByMilestoneId(milestoneId)
        // Lấy 10 ký tự đầu tiên của folderName (nếu cần)
        //const shortFolderName = folderName.substring(0, 20)
        //console.log('milestoneId', milestoneId)
        const filesInfo = await this.uploadManyFilesProvider.uploadManyFiles(
            userId,
            files,
            UploadFileTypes.REPORT,
            'mlml' + milestoneId
        )
        const fileSnapshot = filesInfo.map((file) => ({
            name: file.fileNameBase,
            url: file.fileUrl,
            size: file.size
        })) as FileInfo[]
        await this.milestoneRepository.uploadReport(milestoneId, fileSnapshot, userId)
        return fileSnapshot
    }
    async createTaskInMinesTone(body: RequestCreate, userId: string) {
        //Tạo task mới
        const newTask = await this.taskService.createTask(body, userId)
        return await this.milestoneRepository.createTaskInMinesTone(body.milestoneId, newTask._id.toString())
    }
    async facultyGetMilestonesInPeriod(periodId: string) {
        return await this.milestoneRepository.facultyGetMilestonesInPeriod(periodId)
    }
    async facultyDownloadZipWithBatch(milestoneTemplate: string, res: Response) {
        //cầm batchDI đi tìm milestone lấy được list fileUrl
        //1. Lấy toàn bộ milestone liên quan với batchId
        const milestoneList = await this.milestoneRepository.findByCondition({
            parentId: new mongoose.Types.ObjectId(milestoneTemplate),
            deleted_at: null
        })
        if (!milestoneList || milestoneList.length === 0) {
            throw new Error('Không tìm thấy mốc nào liên quan đến batchId này')
        }
        const milestoneFileNames = milestoneList.map((ml) => 'mlml' + ml._id.toString() + '/')
        //2. Lấy toàn bộ fileUrl từ các milestone từa tìm được
        await this.downLoadFileProvider.downloadZipWithPrefix(milestoneFileNames, res)
    }

    async facultyDownloadZipWithMilestoneId(milestoneId: string, res: Response) {
        //cầm batchDI đi tìm milestone lấy được list fileUrl
        //1. Lấy toàn bộ milestone liên quan với batchId
        const milestone = await this.milestoneRepository.findOneByCondition({
            _id: new mongoose.Types.ObjectId(milestoneId),
            deleted_at: null
        })
        if (!milestone) {
            throw new Error('Không tìm thấy mốc')
        }
        const milestoneFileNames = ['mlml' + milestone._id.toString() + '/']
        //2. Lấy toàn bộ fileUrl từ các milestone từa tìm được
        await this.downLoadFileProvider.downloadZipWithPrefix(milestoneFileNames, res)
    }
    async facultyGetTopicInBatchMilestone(batchId: string, query: PaginationRequestTopicInMilestoneQuery) {
        return await this.milestoneRepository.facultyGetTopicInBatchMilestone(batchId, query)
    }
    async facultyGetMilestonesInManageDefenseAssignment(periodId: string) {
        return await this.milestoneRepository.facultyGetMilestonesInManageDefenseAssignment(periodId)
    }

    async manageTopicsInDefenseMilestone(body: ManageTopicsInDefenseMilestoneDto, userId: string) {
        return await this.milestoneRepository.manageTopicsInDefenseMilestone(body, userId)
    }

    async manageLecturersInDefenseMilestone(body: ManageLecturersInDefenseMilestoneDto, userId: string) {
        return await this.milestoneRepository.manageLecturersInDefenseMilestone(body, userId)
    }
    async upload(userId: string, milestoneId: string, files: Express.Multer.File) {
        const res = await this.uploadManyFilesProvider.uploadManyFiles(
            userId,
            [files],
            UploadFileTypes.DOCUMENT,
            'mlml' + milestoneId
        )

        if (res && res.length > 0) {
            await this.milestoneRepository.saveScoringResult(milestoneId, res[0]._id.toString())
            return
        }
        return false
    }
    async deleteScoringResultFile(milestoneTemplateId: string) {
        const res = await this.milestoneRepository.deleteScoringResultFile(milestoneTemplateId)
        return res ? true : false
    }
    async updateMilestoneTemplatePublishState(milestoneTemplateId: string, isPublished: boolean) {
        return await this.milestoneRepository.updateMilestoneTemplatePublishState(milestoneTemplateId, isPublished)
    }
    async blockGrade(milestoneId: string) {
        return await this.milestoneRepository.blockGrade(milestoneId)
    }
    async getAllDefenseMilestonesForFaculty(facultyId: string, queryParams: PaginationAllDefenseMilestonesQuery) {
        return await this.milestoneRepository.getAllDefenseMilestonesForFaculty(facultyId, queryParams)
    }
    async getAssignedDefenseMilestonesForLecturer(lecturerId: string, facultyId: string) {
        return await this.milestoneRepository.getAssignedDefenseMilestonesForLecturer(lecturerId, facultyId)
    }
    async getYearsOfDefenseMilestones(facultyId: string) {
        return await this.milestoneRepository.getYearsOfDefenseMilestones(facultyId)
    }
    async getDefenseMilestoneDetailById(milestoneTemplateId: string) {
        return await this.milestoneRepository.getDefenseMilestoneDetailById(milestoneTemplateId)
    }

    // Lấy danh sách đề tài trong defense milestone để quản lý lưu trữ
    async getTopicsInDefenseMilestoneForArchive(milestoneTemplateId: string, query: GetTopicsInDefenseMilestoneQuery) {
        const { status, search, isScored, isInLibrary, page = 1, limit = 20 } = query

        // 1. Lấy tất cả councils trong milestone này
        const councils = await this.defenseCouncilModel
            .find({
                milestoneTemplateId: new mongoose.Types.ObjectId(milestoneTemplateId)
            })
            .lean()

        // 2. Thu thập tất cả topicIds từ các councils
        const topicIdsSet = new Set<string>()
        const councilMap = new Map<string, any>() // Map topicId -> council info

        councils.forEach((council) => {
            council.topics.forEach((topicAssignment) => {
                const topicId = topicAssignment.topicId.toString()
                topicIdsSet.add(topicId)
                councilMap.set(topicId, {
                    councilName: council.name,
                    defenseDate: council.scheduledDate,
                    isScored: topicAssignment.scores && topicAssignment.scores.length > 0,
                    isLocked: topicAssignment.isLocked,
                    finalScore: topicAssignment.finalScore,
                    gradeText: topicAssignment.gradeText,
                    students: topicAssignment.students,
                    lecturers: topicAssignment.lecturers
                })
            })
        })

        // 3. Build query để lấy topics
        const topicQuery: any = {
            _id: { $in: Array.from(topicIdsSet).map((id) => new mongoose.Types.ObjectId(id)) }
        }

        // Filter theo status
        if (status) {
            topicQuery.currentStatus = status
        }

        // Filter theo isInLibrary
        if (isInLibrary !== undefined) {
            topicQuery.isPublishedToLibrary = isInLibrary
        }

        // Search theo title
        if (search) {
            topicQuery.$or = [
                { titleVN: { $regex: search, $options: 'i' } },
                { titleEng: { $regex: search, $options: 'i' } }
            ]
        }

        // 4. Pagination
        const skip = (page - 1) * limit
        const [topics, total] = await Promise.all([
            this.topicModel.find(topicQuery).skip(skip).limit(limit).lean(),
            this.topicModel.countDocuments(topicQuery)
        ])

        // 5. Format response
        const formattedTopics = topics.map((topic) => {
            const councilInfo = councilMap.get(topic._id.toString())
            const hasFullDocuments = topic.finalProduct?.thesisReport && topic.finalProduct.thesisReport.length > 0

            // Filter theo isScored nếu có
            if (isScored !== undefined && councilInfo?.isScored !== isScored) {
                return null
            }

            return {
                topicId: topic._id.toString(),
                titleVN: topic.titleVN,
                titleEng: topic.titleEng,
                students: councilInfo?.students || [],
                lecturers: councilInfo?.lecturers || [],
                finalScore: councilInfo?.finalScore,
                gradeText: councilInfo?.gradeText,
                isScored: councilInfo?.isScored || false,
                isLocked: councilInfo?.isLocked || false,
                isPublishedToLibrary: topic.isPublishedToLibrary || false,
                isHiddenInLibrary: topic.isHiddenInLibrary || false,
                currentStatus: topic.currentStatus,
                councilName: councilInfo?.councilName,
                defenseDate: councilInfo?.defenseDate,
                hasFullDocuments
            }
        })

        // Filter out nulls (from isScored filter)
        const filteredTopics = formattedTopics.filter((t) => t !== null)

        return {
            topics: filteredTopics,
            total: filteredTopics.length,
            page,
            limit,
            totalPages: Math.ceil(filteredTopics.length / limit)
        }
    }

    // Bulk archive topics (lưu vào thư viện)
    async bulkArchiveTopics(topicIds: string[], userId: string) {
        const results = {
            successCount: 0,
            failedCount: 0,
            failedTopics: [] as Array<{ topicId: string; reason: string }>
        }

        for (const topicId of topicIds) {
            try {
                const topic = await this.topicModel.findById(topicId)

                if (!topic) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        reason: 'Không tìm thấy đề tài'
                    })
                    continue
                }

                // Kiểm tra điều kiện: phải có điểm và >= 5.5
                if (!topic.defenseResult?.finalScore || topic.defenseResult.finalScore < 5.5) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        reason: 'Đề tài chưa đạt điểm yêu cầu (>= 5.5)'
                    })
                    continue
                }

                // Kiểm tra có đầy đủ tài liệu không
                if (!topic.finalProduct?.thesisReport || topic.finalProduct.thesisReport.length === 0) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        reason: 'Đề tài chưa có báo cáo cuối cùng'
                    })
                    continue
                }

                // Update topic
                await this.topicModel.findByIdAndUpdate(topicId, {
                    isPublishedToLibrary: true,
                    isHiddenInLibrary: false
                })

                results.successCount++
            } catch (error) {
                results.failedCount++
                results.failedTopics.push({
                    topicId,
                    reason: error.message || 'Lỗi không xác định'
                })
            }
        }

        return {
            success: results.successCount > 0,
            successCount: results.successCount,
            failedCount: results.failedCount,
            failedTopics: results.failedTopics,
            message: `Đã lưu ${results.successCount}/${topicIds.length} đề tài vào thư viện`
        }
    }

    // Bulk hide/unhide topics (ẩn/hiện trong thư viện)
    async bulkHideTopics(topicIds: string[], isHidden: boolean, userId: string) {
        const results = {
            successCount: 0,
            failedCount: 0,
            failedTopics: [] as Array<{ topicId: string; reason: string }>
        }

        for (const topicId of topicIds) {
            try {
                const topic = await this.topicModel.findById(topicId)

                if (!topic) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        reason: 'Không tìm thấy đề tài'
                    })
                    continue
                }

                // Update topic
                await this.topicModel.findByIdAndUpdate(topicId, {
                    isHiddenInLibrary: isHidden,
                    hiddenByAdmin: isHidden ? userId : null,
                    hiddenAt: isHidden ? new Date() : null
                })

                results.successCount++
            } catch (error) {
                results.failedCount++
                results.failedTopics.push({
                    topicId,
                    reason: error.message || 'Lỗi không xác định'
                })
            }
        }

        const action = isHidden ? 'ẩn' : 'hiện'
        return {
            success: results.successCount > 0,
            successCount: results.successCount,
            failedCount: results.failedCount,
            failedTopics: results.failedTopics,
            message: `Đã ${action} ${results.successCount}/${topicIds.length} đề tài trong thư viện`
        }
    }

    /**
     * Lấy danh sách đề tài có thể lưu vào thư viện trong một kỳ
     */
    async getTopicsForArchiveInPeriod(periodId: string, query: GetTopicsForArchiveQuery) {
        // Lấy tất cả defense milestones trong kỳ
        const milestones = await this.milestoneTemplateModel
            .find({
                periodId: new mongoose.Types.ObjectId(periodId),
                type: 'defense',
                deleted_at: null
            })
            .exec()

        const milestoneIds = milestones.map((m) => m._id)

        // Lấy councils từ các milestones
        const councils = await this.defenseCouncilModel
            .find({
                milestoneTemplateId: { $in: milestoneIds },
                deleted_at: null
            })
            .exec()

        // Map topicId -> score info
        const topicScoreMap = new Map<string, any>()

        for (const council of councils) {
            for (const topicAssignment of council.topics) {
                const topicId = topicAssignment.topicId.toString()
                topicScoreMap.set(topicId, {
                    finalScore: topicAssignment.finalScore,
                    gradeText: topicAssignment.gradeText,
                    scores: topicAssignment.scores,
                    councilName: council.name,
                    councilId: council._id,
                    isLocked: topicAssignment.isLocked,
                    scheduledDate: council.scheduledDate,
                    isPublished: council.isPublished
                })
            }
        }

        // Query topics
        const topicsQuery: any = {
            periodId: new mongoose.Types.ObjectId(periodId),
            _id: {
                $in: Array.from(topicScoreMap.keys()).map((id) => new mongoose.Types.ObjectId(id))
            },
            deleted_at: null
        }

        // Apply status filter
        if (query.status && query.status !== 'all') {
            if (query.status === 'graded') {
                topicsQuery.currentStatus = TopicStatus.Graded
            } else if (query.status === 'assigned') {
                topicsQuery.currentStatus = TopicStatus.AssignedDefense
            } else if (query.status === 'archived') {
                topicsQuery.isPublishedToLibrary = true
            } else if (query.status === 'locked') {
                // Filter by locked topics
                const lockedTopicIds = Array.from(topicScoreMap.entries())
                    .filter(([_, info]) => info.isLocked)
                    .map(([id]) => id)
                topicsQuery._id = {
                    $in: lockedTopicIds.map((id) => new mongoose.Types.ObjectId(id))
                }
            }
        }

        // Apply search
        if (query.query) {
            topicsQuery.$or = [
                { titleVN: { $regex: query.query, $options: 'i' } },
                { titleEng: { $regex: query.query, $options: 'i' } }
            ]
        }

        const topics = await this.topicModel
            .find(topicsQuery)
            .populate('majorId', 'name code')
            .sort({ updatedAt: -1 })
            .skip(((query.page ?? 1) - 1) * (query.limit ?? 20))
            .limit(query.limit ?? 20)
            .exec()

        const total = await this.topicModel.countDocuments(topicsQuery)

        // Enrich with student and lecturer info
        const enrichedTopics = await Promise.all(
            topics.map(async (topic) => {
                const topicId = topic._id.toString()
                const scoreInfo = topicScoreMap.get(topicId)

                // Get students
                const students = await this.studentRegisterTopicModel
                    .find({
                        topicId: topic._id,
                        status: 'approved'
                    })
                    .populate('userId', 'fullName studentCode email')
                    .exec()

                // Get lecturers
                const lecturers = await this.lecturerRegisterTopicModel
                    .find({
                        topicId: topic._id,
                        status: { $ne: 'rejected' }
                    })
                    .populate('userId', 'fullName title email')
                    .exec()

                // Check archive eligibility
                const canArchive = this.checkArchiveEligibility(topic, scoreInfo)

                return {
                    topicId: topic._id,
                    titleVN: topic.titleVN,
                    titleEng: topic.titleEng,
                    description: topic.description,
                    currentStatus: topic.currentStatus,
                    major: topic.majorId,
                    students: students.map((s: any) => ({
                        userId: s.userId._id,
                        fullName: s.userId.fullName,
                        studentCode: s.userId.studentCode,
                        email: s.userId.email
                    })),
                    lecturers: lecturers.map((l: any) => ({
                        userId: l.userId._id,
                        fullName: l.userId.fullName,
                        title: l.userId.title,
                        email: l.userId.email
                    })),
                    finalScore: scoreInfo?.finalScore,
                    gradeText: scoreInfo?.gradeText,
                    councilName: scoreInfo?.councilName,
                    scheduledDate: scoreInfo?.scheduledDate,
                    isLocked: scoreInfo?.isLocked || false,
                    isPublished: scoreInfo?.isPublished || false,
                    isPublishedToLibrary: topic.isPublishedToLibrary || false,
                    isHiddenInLibrary: topic.isHiddenInLibrary || false,
                    hasFinalProduct: !!(topic.finalProduct?.thesisReport && topic.finalProduct.thesisReport.length > 0),
                    canArchive: canArchive.eligible,
                    archiveBlockers: canArchive.blockers,
                    defenseResult: topic.defenseResult
                }
            })
        )

        return {
            data: enrichedTopics,
            meta: {
                page: query.page,
                limit: query.limit,
                totalItems: total,
                totalPages: Math.ceil(total / (query.limit?? 1))
            }
        }
    }

    /**
     * Kiểm tra điều kiện lưu trữ
     */
    private checkArchiveEligibility(topic: any, scoreInfo: any): { eligible: boolean; blockers: string[] } {
        const blockers: string[] = []

        // 1. Kiểm tra điểm số
        if (!scoreInfo?.finalScore) {
            blockers.push('Chưa có điểm số')
        } else if (scoreInfo.finalScore < 5.5) {
            blockers.push('Điểm số chưa đạt yêu cầu (< 5.5)')
        }

        // 2. Kiểm tra báo cáo
        if (!topic.finalProduct?.thesisReport || topic.finalProduct.thesisReport.length === 0) {
            blockers.push('Chưa có báo cáo cuối cùng')
        }

        // 3. Kiểm tra trạng thái
        if (topic.currentStatus !== TopicStatus.Graded && topic.currentStatus !== TopicStatus.AssignedDefense) {
            blockers.push('Đề tài chưa được chấm điểm')
        }

        // 4. Kiểm tra đã lưu trữ chưa
        if (topic.isPublishedToLibrary) {
            blockers.push('Đề tài đã được lưu vào thư viện')
        }

        // 5. Kiểm tra điểm đã được công bố
        if (!scoreInfo?.isPublished) {
            blockers.push('Điểm chưa được công bố')
        }

        return {
            eligible: blockers.length === 0,
            blockers
        }
    }

    /**
     * Bulk lưu đề tài vào thư viện từ kỳ
     */
    async bulkArchiveTopicsInPeriod(topicIds: string[], userId: string, periodId: string) {
        const results = {
            successCount: 0,
            failedCount: 0,
            failedTopics: [] as Array<{ topicId: string; topicTitle: string; reason: string }>
        }

        for (const topicId of topicIds) {
            try {
                const topic = await this.topicModel.findById(topicId)

                if (!topic) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        topicTitle: 'Unknown',
                        reason: 'Không tìm thấy đề tài'
                    })
                    continue
                }

                // Get score info from defense council
                const milestones = await this.milestoneTemplateModel
                    .find({
                        periodId: new mongoose.Types.ObjectId(periodId),
                        type: 'defense',
                        deleted_at: null
                    })
                    .exec()

                const milestoneIds = milestones.map((m) => m._id)
                const councils = await this.defenseCouncilModel
                    .find({
                        milestoneTemplateId: { $in: milestoneIds },
                        deleted_at: null
                    })
                    .exec()

                let scoreInfo: any = null

                for (const council of councils) {
                    const topicAssignment = council.topics.find((t) => t.topicId.toString() === topicId)
                    if (topicAssignment) {
                        scoreInfo = {
                            finalScore: topicAssignment.finalScore,
                            gradeText: topicAssignment.gradeText,
                            scores: topicAssignment.scores,
                            councilName: council.name,
                            scheduledDate: council.scheduledDate,
                            isPublished: council.isPublished
                        }
                        break
                    }
                }

                // Check eligibility
                const eligibility = this.checkArchiveEligibility(topic, scoreInfo)

                if (!eligibility.eligible) {
                    results.failedCount++
                    results.failedTopics.push({
                        topicId,
                        topicTitle: topic.titleVN,
                        reason: eligibility.blockers.join(', ')
                    })
                    continue
                }

                // Lưu kết quả bảo vệ vào topic schema nếu chưa có
                if (!topic.defenseResult && scoreInfo) {
                    topic.defenseResult = {
                        defenseDate: scoreInfo.scheduledDate,
                        periodName: periodId,
                        finalScore: scoreInfo.finalScore,
                        gradeText: scoreInfo.gradeText,
                        councilMembers: scoreInfo.scores.map((s: any) => ({
                            fullName: s.scorerName,
                            role: this.mapScoreTypeToRole(s.scoreType),
                            score: s.total,
                            note: s.comment || ''
                        })),
                        councilName: scoreInfo.councilName,
                        isPublished: scoreInfo.isPublished
                    }
                }

                // Update topic
                topic.isPublishedToLibrary = true
                topic.isHiddenInLibrary = false
                await topic.save()

                // Add phase history
                await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                    topicId,
                    TopicStatus.Archived,
                    userId,
                    'Đề tài được lưu vào thư viện số'
                )

                results.successCount++
            } catch (error) {
                results.failedCount++
                results.failedTopics.push({
                    topicId,
                    topicTitle: 'Error',
                    reason: error.message || 'Lỗi không xác định'
                })
                console.error(`Failed to archive topic ${topicId}:`, error)
            }
        }

        return results
    }

    /**
     * Map scoreType sang role
     */
    private mapScoreTypeToRole(scoreType: string): string {
        const roleMap = {
            chairperson: 'Chủ tịch',
            secretary: 'Thư ký',
            member: 'Ủy viên',
            reviewer: 'Phản biện',
            supervisor: 'GVHD'
        }
        return roleMap[scoreType] || scoreType
    }
}
