import { Inject, Injectable } from '@nestjs/common'
import { IMilestoneRepository } from '../repository/miletones.repository.interface'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    PayloadUpdateMilestone,
    RequestLecturerReview
} from '../dtos/request-milestone.dto'
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

@Injectable()
export class MilestonesService {
    constructor(
        @Inject('IMilestoneRepository') private readonly milestoneRepository: IMilestoneRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider,
        private readonly taskService: TasksService,
        private readonly getGroupProvider: GetGroupProvider,
        private readonly downLoadFileProvider: DownLoadFileProvider
    ) {}
    async reviewMilestone(milestoneId: string, lecturerId: string, body: RequestLecturerReview) {
        return await this.milestoneRepository.reviewMilestone(milestoneId, lecturerId, body)
    }
    async getMilestonesOfGroup(groupId: string) {
        return await this.milestoneRepository.getMilestonesOfGroup(groupId)
    }
    async createMilestone(body: PayloadCreateMilestone, user: ActiveUserData) {
        return await this.milestoneRepository.createMilestone(body, user)
    }
    async facultyCreate(body: PayloadFacultyCreateMilestone, user: ActiveUserData) {
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
    async createTaskInMinesTone(body: RequestCreate) {
        //Tạo task mới
        const newTask = await this.taskService.createTask(body)
        return await this.milestoneRepository.createTaskInMinesTone(body.milestoneId, newTask._id.toString())
    }
    async facultyGetMilestonesInPeriod(periodId: string) {
        return await this.milestoneRepository.facultyGetMilestonesInPeriod(periodId)
    }
    async facultyDownloadZipWithBatch(batchId: string, res: Response) {
        //cầm batchDI đi tìm milestone lấy được list fileUrl
        //1. Lấy toàn bộ milestone liên quan với batchId
        const milestoneList = await this.milestoneRepository.findByCondition({ refId: batchId, deleted_at: null })
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
}
