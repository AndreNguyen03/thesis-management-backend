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
        
        // Lookup tasks
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

        // Lookup user info for submission
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'submission.createdBy',
                foreignField: '_id',
                as: 'submissionUser'
            }
        })

        // Calculate task progress
        pipeline.push({
            $addFields: {
                tasksCompleted: {
                    $size: {
                        $filter: {
                            input: { $ifNull: ['$tasks', []] },
                            as: 'task',
                            cond: { $eq: ['$$task.status', 'Done'] }
                        }
                    }
                },
                tasksUnCompleted: {
                    $size: {
                        $filter: {
                            input: { $ifNull: ['$tasks', []] },
                            as: 'task',
                            cond: { $ne: ['$$task.status', 'Done'] }
                        }
                    }
                }
            }
        })

        // Unwind and lookup submission history
        pipeline.push(
            { $unwind: { path: '$submissionHistory', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'submissionHistory.createdBy',
                    foreignField: '_id',
                    as: 'submissionHistory.user'
                }
            },
            { $unwind: { path: '$submissionHistory.user', preserveNullAndEmptyArrays: true } }
        )

        // Group and project final structure
        pipeline.push({
            $group: {
                _id: '$_id',
                title: { $first: '$title' },
                description: { $first: '$description' },
                dueDate: { $first: '$dueDate' },
                createdAt: { $first: '$createdAt' },
                updatedAt: { $first: '$updatedAt' },
                submission: { $first: '$submission' },
                submissionUser: { $first: '$submissionUser' },
                tasks: { $first: '$tasks' },
                tasksCompleted: { $first: '$tasksCompleted' },
                tasksUnCompleted: { $first: '$tasksUnCompleted' },
                deleted_at: { $first: '$deleted_at' },
                groupId: { $first: '$groupId' },
                type: { $first: '$type' },
                status: { $first: '$status' },
                submissionHistory: {
                    $push: {
                        $cond: [
                            { $ifNull: ['$submissionHistory.createdBy', false] },
                            {
                                date: '$submissionHistory.date',
                                files: '$submissionHistory.files',
                                createdBy: '$submissionHistory.user',
                            },
                            '$$REMOVE'
                        ]
                    }
                }
            }
        })

        // Final projection with progress calculation
        pipeline.push({
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                dueDate: 1,
                createdAt: 1,
                updatedAt: 1,
                submission: {
                    date: '$submission.date',
                    files: '$submission.files',
                    createdBy: { $arrayElemAt: ['$submissionUser', 0] }
                },
                tasks: 1,
                progress: {
                    $cond: [
                        { $eq: [{ $add: ['$tasksCompleted', '$tasksUnCompleted'] }, 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ['$tasksCompleted', { $add: ['$tasksCompleted', '$tasksUnCompleted'] }] },
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
        })

        // Filter by groupId and sort
        pipeline.push(
            { $match: { groupId: new mongoose.Types.ObjectId(groupId), deleted_at: null } },
            { $sort: { dueDate: -1 } }
        )

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
                {
                    $push: {
                        submissionHistory: { date: new Date(), files, createdBy: new mongoose.Types.ObjectId(userId) }
                    },
                    $set: { submission: { date: new Date(), files, createdBy: new mongoose.Types.ObjectId(userId) } }
                },
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
