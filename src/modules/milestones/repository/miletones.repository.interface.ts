import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    PayloadUpdateMilestone,
    RequestLecturerReview
} from '../dtos/request-milestone.dto'
import { FileInfo, Milestone } from '../schemas/milestones.schemas'

export interface IMilestoneRepository extends BaseRepositoryInterface<Milestone> {
    getMilestonesOfGroup(groupId: string): Promise<Milestone[]>
    createMilestone(body: PayloadCreateMilestone, user: ActiveUserData)
    facultyCreateMilestone(body: PayloadFacultyCreateMilestone, user: ActiveUserData, groupIds: string[])
    updateMilestone(milestoneId: string, body: PayloadUpdateMilestone): Promise<Milestone>
    uploadReport(miletoneId: string, files: FileInfo[], userId: string): Promise<Milestone>
    createTaskInMinesTone(milestoneId: string, taskId: string): Promise<Milestone>
    facultyGetMilestonesInPeriod(periodId: string): Promise<Milestone[]>
    getTopicNameByMilestoneId(milestoneId: string): Promise<string>
    facultyGetTopicInBatchMilestone(
        batchId: string,
        query: PaginationRequestTopicInMilestoneQuery
    ): Promise<Paginated<Milestone>>
    reviewMilestone(milestoneId: string, lecturerId: string, body: RequestLecturerReview): Promise<boolean>
}
