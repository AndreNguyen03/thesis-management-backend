import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { PayloadCreateMilestone, PayloadUpdateMilestone } from '../dtos/request-milestone.dto'
import { FileInfo, Milestone } from '../schemas/milestones.schemas'

export interface IMilestoneRepository extends BaseRepositoryInterface<Milestone> {
    getMilestonesOfGroup(groupId: string): Promise<Milestone[]>
    createMilestone(body: PayloadCreateMilestone): Promise<Milestone>
    updateMilestone(milestoneId: string, body: PayloadUpdateMilestone): Promise<Milestone>
    uploadReport(miletoneId: string, files: FileInfo[], userId: string): Promise<Milestone>
    createTaskInMinesTone(milestoneId: string, taskId: string): Promise<Milestone>
}
