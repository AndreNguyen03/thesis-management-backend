import { Inject, Injectable } from '@nestjs/common'
import { IMilestoneRepository } from '../repository/miletones.repository.interface'
import { PayloadCreateMilestone, PayloadUpdateMilestone } from '../dtos/request-milestone.dto'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { FileInfo } from '../schemas/milestones.schemas'
import { TasksService } from '../../todolists/application/tasks.service'
import { RequestCreate } from '../../todolists/dtos/request-update.dtos'

@Injectable()
export class MilestonesService {
    constructor(
        @Inject('IMilestoneRepository') private readonly milestoneRepository: IMilestoneRepository,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider,
        private readonly taskService: TasksService
    ) {}
    async getMilestonesOfGroup(groupId: string) {
        return await this.milestoneRepository.getMilestonesOfGroup(groupId)
    }
    async createMilestone(body: PayloadCreateMilestone) {
        return await this.milestoneRepository.createMilestone(body)
    }
    async updateMilestone(milestoneId: string, body: PayloadUpdateMilestone) {
        return await this.milestoneRepository.updateMilestone(milestoneId, body)
    }
    async submitReport(files: Express.Multer.File[], milestoneId: string, userId: string) {
        const filesInfo = await this.uploadManyFilesProvider.uploadManyFiles(userId, files, UploadFileTypes.REPORT)
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
}
