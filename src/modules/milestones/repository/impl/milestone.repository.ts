import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { FileInfo, Milestone } from '../../schemas/milestones.schemas'
import { BaseRepositoryInterface } from '../../../../shared/base/repository/base.repository.interface'
import { IMilestoneRepository } from '../miletones.repository.interface'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { PayloadCreateMilestone, PayloadUpdateMilestone } from '../../dtos/request-milestone.dto'
import { group } from 'console'
import path from 'path'

@Injectable()
export class MilestoneRepository extends BaseRepositoryAbstract<Milestone> implements IMilestoneRepository {
    constructor(@InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>) {
        super(milestoneModel)
    }
    async updateMilestone(milestoneId: string, body: PayloadUpdateMilestone): Promise<Milestone> {
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate({ _id: milestoneId, deleted_at: null }, body, { new: true })
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
    async getMilestonesOfGroup(groupId: string): Promise<Milestone[]> {
        const pipeline: any[] = []
        pipeline.push({
            $lookup: {
                from: 'tasks',
                let: { taskIds: '$taskIds' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ['$_id', { $ifNull: ['$$taskIds', []] }] },
                            deleted_at: null
                        }
                    }
                ],
                as: 'tasks'
            }
        })
        pipeline.push(
            {
                $addFields: {
                    tasksUnCompleted: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$tasks', []] },
                                as: 'task',
                                cond: { $ne: ['$$task.status', 'Done'] }
                            }
                        }
                    },
                    tasksCompleted: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$tasks', []] },
                                as: 'task',
                                cond: { $eq: ['$$task.status', 'Done'] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    dueDate: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    submission: 1,
                    tasks: 1,
                    progress: {
                        $cond: [
                            { $eq: [{ $add: ['$tasksCompleted', '$tasksUnCompleted'] }, 0] },
                            0,
                            {
                                $multiply: [
                                    {
                                        $divide: ['$tasksCompleted', { $add: ['$tasksCompleted', '$tasksUnCompleted'] }]
                                    },
                                    100
                                ]
                            }
                        ]
                    },
                    deleted_at: 1,
                    groupId: 1,
                    type: 1,
                    status: 1,
                    submissionHistory: 1
                }
            }
        )
        pipeline.push({ $match: { groupId: new mongoose.Types.ObjectId(groupId), deleted_at: null } })
        pipeline.push({ $sort: { dueDate: -1 } })
        const results = await this.milestoneModel.aggregate(pipeline).exec()
        return results
    }
    async createMilestone(body: PayloadCreateMilestone): Promise<Milestone> {
        const createdMilestone = new this.milestoneModel(body)
        return await createdMilestone.save()
    }
    async uploadReport(miletoneId: string, files: FileInfo[], userId: string): Promise<Milestone> {
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(miletoneId) },
                { $set: { submission: { date: new Date(), files, createdBy: userId } } },
                //phát triển thêm lịch sử nộp
                { new: true }
            )
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
    async createTaskInMinesTone(milestoneId: string, taskId: string): Promise<Milestone> {
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(milestoneId), deleted_at: null },
                { $push: { taskIds: new mongoose.Types.ObjectId(taskId) } },
                { new: true }
            )
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
}
