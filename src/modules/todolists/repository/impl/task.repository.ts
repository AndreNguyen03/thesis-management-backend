import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Subtask, Task, TaskColumn, TaskComment, TaskActivity, FileInfo } from '../../schemas/task.schema'
import { ITaskRepository } from '../task.repository.interface'
import mongoose, { Model } from 'mongoose'
import { ObjectId } from 'mongodb'
import { RequestCreate } from '../../dtos/request-update.dtos'
import { TaskColumnTitleEnum } from '../../enum/taskcolumn.enum'
import { BadRequestException, ForbiddenException, NotFoundException, Inject } from '@nestjs/common'
import { MoveInColumnQuery, MoveToColumnQuery } from '../../dtos/request-patch.dtos'
import { pipe } from 'rxjs'
import { Milestone } from '../../../milestones/schemas/milestones.schemas'
import { Group } from '../../../groups/schemas/groups.schemas'
import { ManageMinioProvider } from '../../../upload-files/providers/manage-file-minio.provider'

export class TaskRepository extends BaseRepositoryAbstract<Task> implements ITaskRepository {
    constructor(
        @InjectModel(Task.name) private readonly taskModel: Model<Task>,
        @InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>,
        @InjectModel(Group.name) private readonly groupModel: Model<Group>,
        @Inject(ManageMinioProvider) private readonly manageMinioProvider: ManageMinioProvider
    ) {
        super(taskModel)
    }
    async getTasks(groupId: string): Promise<Task[]> {
        const pipeline: any[] = []
        pipeline.push(
            {
                $lookup: {
                    from: 'milestones',
                    localField: 'milestoneId',
                    foreignField: '_id',
                    as: 'milestone'
                }
            },
            {
                $unwind: {
                    path: '$milestone',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        pipeline.push(
            {
                $match: { groupId: new mongoose.Types.ObjectId(groupId), deleted_at: null }
            },
            { $sort: { created_at: -1 } }
        )
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'columns.items.assignees',
                foreignField: '_id',
                as: 'assigneeUsers',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })
        pipeline.push({
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                status: 1,
                createdAt: '$created_at',
                updatedAt: '$updated_at',
                columns: 1,
                milestone: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    dueDate: 1
                }
            }
        })

        const results = await this.taskModel.aggregate(pipeline).exec()
        return results
    }
    async createTask(body: RequestCreate, userId: string): Promise<Task> {
        const { milestoneId, groupId, title, description } = body
        const defaultColumns = [
            TaskColumnTitleEnum.TO_DO,
            TaskColumnTitleEnum.IN_PROGRESS,
            TaskColumnTitleEnum.DONE
        ].map((title) => ({ title }))
        const newTask = new this.taskModel({
            groupId: new mongoose.Types.ObjectId(groupId),
            milestoneId: new mongoose.Types.ObjectId(milestoneId),
            title: title,
            description: description || '',
            columns: defaultColumns,
            reporter: userId
        })
        return await newTask.save()
    }
    async deleteTask(id: string): Promise<string> {
        const res = await this.taskModel
            .updateOne({ _id: new mongoose.Types.ObjectId(id), deleted_at: null }, { deleted_at: new Date() })
            .exec()
        if (res.modifiedCount === 0) {
            throw new Error('Task not found or could not be deleted')
        }
        return id
    }
    async createNewSubtask(id: string, columnId: string, title: string, userId: string): Promise<Subtask> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(id))
        if (!task) {
            throw new BadRequestException('Nhiệm vụ không tồn tại')
        }
        let newSubTask = new Subtask()
        newSubTask._id = new mongoose.Types.ObjectId() as any
        task?.columns.forEach((column) => {
            if (column._id.toString() === columnId) {
                newSubTask.title = title
                newSubTask.isCompleted = false
                newSubTask.deleted_at = null
                newSubTask.reporter = userId
                column.items.push(newSubTask)
            }
        })
        await task?.save()
        return newSubTask
    }
    async deleteSubtask(taskId: string, columnId: string, subtaskId: string): Promise<string> {
        console.log('Deleting subtask with ID:', columnId, subtaskId)
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new BadRequestException('Nhiệm vụ không tồn tại')
        }
        task?.columns.forEach((column) => {
            if (column._id.toString() === columnId) {
                column.items = column.items.filter((subtask) => subtask._id.toString() !== subtaskId)
            }
        })
        await task?.save()
        console.log(
            'Subtask deleted in task:',
            task.columns.map((col) => col.items)
        )
        return task._id.toString()
    }

    async updateSubtask(
        taskId: string,
        columnId: string,
        subtaskId: string,
        updates: any,
        userId: string
    ): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new BadRequestException('Nhiệm vụ không tồn tại')
        }

        let subtaskFound = false
        let subtaskTitle = ''

        task.columns.forEach((column) => {
            if (column._id.toString() === columnId) {
                const subtask = column.items.find((item) => item._id.toString() === subtaskId)
                if (subtask) {
                    subtaskFound = true
                    subtaskTitle = subtask.title

                    // Update subtask fields
                    if (updates.title !== undefined) subtask.title = updates.title
                    if (updates.description !== undefined) subtask.description = updates.description
                    if (updates.assignees !== undefined) {
                        subtask.assignees = updates.assignees.map((id: string) => new mongoose.Types.ObjectId(id))
                    }
                    if (updates.priority !== undefined) subtask.priority = updates.priority
                    if (updates.labels !== undefined) subtask.labels = updates.labels
                    if (updates.dueDate !== undefined) {
                        subtask.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
                    }
                    if (updates.reporter !== undefined) {
                        subtask.reporter = updates.reporter
                            ? (new mongoose.Types.ObjectId(updates.reporter) as any)
                            : (null as any)
                    }
                }
            }
        })

        if (!subtaskFound) {
            throw new NotFoundException('Subtask không tồn tại')
        }

        // Add activity
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = `cập nhật subtask "${subtaskTitle}"`
        task.activities.push(activity)

        await task.save()
        return task
    }

    async toggleSubtaskComplete(taskId: string, columnId: string, subtaskId: string, userId: string): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new BadRequestException('Nhiệm vụ không tồn tại')
        }

        let subtaskFound = false
        let subtaskTitle = ''
        let newStatus = false

        task.columns.forEach((column) => {
            if (column._id.toString() === columnId) {
                const subtask = column.items.find((item) => item._id.toString() === subtaskId)
                if (subtask) {
                    subtaskFound = true
                    subtaskTitle = subtask.title
                    subtask.isCompleted = !subtask.isCompleted
                    newStatus = subtask.isCompleted
                }
            }
        })

        if (!subtaskFound) {
            throw new NotFoundException('Subtask không tồn tại')
        }

        // Add activity
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = newStatus
            ? `đánh dấu hoàn thành subtask "${subtaskTitle}"`
            : `bỏ đánh dấu hoàn thành subtask "${subtaskTitle}"`
        task.activities.push(activity)

        await task.save()
        return task
    }

    // async updateColumnsInTask(taskId: string, columns: TaskColumn[]): Promise<Task> {
    //     const task = await this.
    // }
    async moveInColumn(id: string, columnId: string, query: MoveInColumnQuery): Promise<void> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(id))
        if (!task) {
            throw new NotFoundException('Nhiệm vụ không tồn tại')
        }
        const column = task.columns.find((col) => col._id.toString() === columnId)
        if (!column) {
            throw new NotFoundException('Cột không tồn tại')
        }

        const { newPos, oldPos } = query

        if (oldPos < 0 || newPos < 0 || oldPos >= column.items.length || newPos >= column.items.length) {
            throw new BadRequestException('Chỉ số không hợp lệ')
        }

        // Đổi chỗ hai phần tử
        const temp = column.items[oldPos]
        column.items[oldPos] = column.items[newPos]
        column.items[newPos] = temp

        await task.save()
    }
    async moveToNewColumn(id: string, body: MoveToColumnQuery): Promise<void> {
        const { subTaskId, oldColumnId, newColumnId, newPos } = body
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(id))
        if (!task) {
            throw new NotFoundException('Nhiệm vụ không tồn tại')
        }
        //Xử lý ở cột cũ
        const oldColumn = task.columns.find((col) => col._id.toString() === oldColumnId)
        //Xử lý ở cột mới
        const newColumn = task.columns.find((col) => col._id.toString() === newColumnId)
        if (!oldColumn || !newColumn) {
            throw new NotFoundException('Cột không tồn tại')
        }
        const subtaskIndex = oldColumn.items.findIndex((subtask) => subtask._id.toString() === subTaskId)
        if (subtaskIndex === -1) {
            throw new NotFoundException('Subtask không tồn tại trong cột cũ')
        }
        const [subtask] = oldColumn.items.splice(subtaskIndex, 1)
        newColumn.items.splice(newPos, 0, subtask)
        await task.save()
    }

    async updateTaskMilestone(taskId: string, milestoneId: string | null, userId: string): Promise<Task> {
        // 1. Tìm task
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        // 2. Kiểm tra quyền (task phải thuộc group của user)
        const group = await this.groupModel.findById(task.groupId)
        if (!group) {
            throw new NotFoundException('Group not found')
        }

        const isUserInGroup = group.participants.some((participantId) => participantId.toString() === userId)
        if (!isUserInGroup) {
            throw new ForbiddenException('You are not a member of this group')
        }

        // 3. Nếu milestoneId = null → Bỏ liên kết
        if (milestoneId === null) {
            task.milestoneId = null
            await task.save()
            return task
        }

        // 4. Validate milestone tồn tại và thuộc cùng group
        const milestone = await this.milestoneModel.findById(new mongoose.Types.ObjectId(milestoneId))
        if (!milestone) {
            throw new NotFoundException('Milestone not found')
        }

        // if (milestone.groupIds.toString() !== task.groupId.toString()) {
        //     throw new BadRequestException('Milestone does not belong to the same group')
        // }

        // 5. Cập nhật
        task.milestoneId = milestoneId
        await task.save()

        // 6. Populate milestone info trước khi return
        await task.populate('milestoneId')

        return task
    }

    // ==================== JIRA-LIKE FEATURES ====================

    async getTaskDetail(taskId: string): Promise<Task> {
        const pipeline: any[] = []

        // Match task by ID
        pipeline.push({
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
                deleted_at: null
            }
        })

        // Lookup assignees
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'assignees',
                foreignField: '_id',
                as: 'assignees',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })

        // Lookup createdBy user
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })

        // Unwind createdBy (single object)
        pipeline.push({
            $unwind: {
                path: '$createdBy',
                preserveNullAndEmptyArrays: true
            }
        })

        // Lookup reporter user
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'reporter',
                foreignField: '_id',
                as: 'reporter',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })

        // Unwind reporter (single object)
        pipeline.push({
            $unwind: {
                path: '$reporter',
                preserveNullAndEmptyArrays: true
            }
        })

        // Lookup milestone
        pipeline.push({
            $lookup: {
                from: 'milestones',
                localField: 'milestoneId',
                foreignField: '_id',
                as: 'milestone',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            dueDate: 1,
                            status: 1
                        }
                    }
                ]
            }
        })

        // Unwind milestone (single object)
        pipeline.push({
            $unwind: {
                path: '$milestone',
                preserveNullAndEmptyArrays: true
            }
        })

        // Lookup comment users
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'comments.userId',
                foreignField: '_id',
                as: 'commentUsers'
            }
        })

        // Lookup activity users
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'activities.userId',
                foreignField: '_id',
                as: 'activityUsers'
            }
        })

        // Lookup subtask assignee users from all columns.items
        pipeline.push({
            $lookup: {
                from: 'users',
                let: { columns: '$columns' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: [
                                    '$_id',
                                    {
                                        $reduce: {
                                            input: '$$columns',
                                            initialValue: [],
                                            in: {
                                                $concatArrays: [
                                                    '$$value',
                                                    {
                                                        $reduce: {
                                                            input: '$$this.items',
                                                            initialValue: [],
                                                            in: {
                                                                $concatArrays: [
                                                                    '$$value',
                                                                    { $ifNull: ['$$this.assignees', []] }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ],
                as: 'subtaskAssigneeUsers'
            }
        })

        // Lookup subtask reporter users
        pipeline.push({
            $lookup: {
                from: 'users',
                let: { columns: '$columns' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: [
                                    '$_id',
                                    {
                                        $reduce: {
                                            input: '$$columns',
                                            initialValue: [],
                                            in: {
                                                $concatArrays: [
                                                    '$$value',
                                                    {
                                                        $map: {
                                                            input: '$$this.items',
                                                            as: 'item',
                                                            in: '$$item.reporter'
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ],
                as: 'subtaskReporterUsers'
            }
        })

        // Add fields to map users to comments, activities, and subtasks
        pipeline.push({
            $addFields: {
                comments: {
                    $map: {
                        input: '$comments',
                        as: 'comment',
                        in: {
                            _id: '$$comment._id',
                            user: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$commentUsers',
                                            cond: { $eq: ['$$this._id', '$$comment.userId'] }
                                        }
                                    },
                                    0
                                ]
                            },
                            content: '$$comment.content',
                            files: '$$comment.files',
                            created_at: '$$comment.created_at',
                            editedAt: '$$comment.editedAt'
                        }
                    }
                },
                activities: {
                    $map: {
                        input: '$activities',
                        as: 'activity',
                        in: {
                            _id: '$$activity._id',
                            user: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$activityUsers',
                                            cond: { $eq: ['$$this._id', '$$activity.userId'] }
                                        }
                                    },
                                    0
                                ]
                            },
                            action: '$$activity.action',
                            metadata: '$$activity.metadata',
                            created_at: '$$activity.created_at'
                        }
                    }
                },
                columns: {
                    $map: {
                        input: '$columns',
                        as: 'column',
                        in: {
                            _id: '$$column._id',
                            title: '$$column.title',
                            items: {
                                $map: {
                                    input: '$$column.items',
                                    as: 'subtask',
                                    in: {
                                        _id: '$$subtask._id',
                                        title: '$$subtask.title',
                                        status: '$$column.title',
                                        isCompleted: '$$subtask.isCompleted',
                                        description: '$$subtask.description',
                                        priority: '$$subtask.priority',
                                        labels: '$$subtask.labels',
                                        dueDate: '$$subtask.dueDate',
                                        assignees: {
                                            $map: {
                                                input: { $ifNull: ['$$subtask.assignees', []] },
                                                as: 'assigneeId',
                                                in: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: '$subtaskAssigneeUsers',
                                                                cond: { $eq: ['$$this._id', '$$assigneeId'] }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        },
                                        reporter: {
                                            $cond: {
                                                if: { $ne: ['$$subtask.reporter', null] },
                                                then: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: '$subtaskReporterUsers',
                                                                cond: {
                                                                    $eq: ['$$this._id', '$$subtask.reporter']
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                else: null
                                            }
                                        },
                                        comments: '$$subtask.comments',
                                        activities: '$$subtask.activities',
                                        created_at: '$$subtask.created_at',
                                        updated_at: '$$subtask.updated_at'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Project final shape
        pipeline.push({
            $project: {
                commentUsers: 0,
                activityUsers: 0,
                subtaskAssigneeUsers: 0,
                subtaskReporterUsers: 0
            }
        })

        const results = await this.taskModel.aggregate(pipeline).exec()

        if (!results || results.length === 0) {
            throw new NotFoundException('Task not found')
        }

        return results[0]
    }

    async getSubtaskDetail(taskId: string, columnId: string, subtaskId: string): Promise<any> {
        const pipeline: any[] = []

        // Match task by ID and unwind columns
        pipeline.push(
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(taskId),
                    deleted_at: null
                }
            },
            {
                $unwind: '$columns'
            },
            {
                $match: {
                    'columns._id': new mongoose.Types.ObjectId(columnId)
                }
            },
            {
                $unwind: '$columns.items'
            },
            {
                $match: {
                    'columns.items._id': new mongoose.Types.ObjectId(subtaskId)
                }
            }
        )

        // Lookup assignees for the subtask
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'columns.items.assignees',
                foreignField: '_id',
                as: 'assigneeUsers',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })

        // Lookup reporter for the subtask
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'columns.items.reporter',
                foreignField: '_id',
                as: 'reporterUser',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            email: 1,
                            avatarUrl: 1
                        }
                    }
                ]
            }
        })

        // Lookup comment users
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'columns.items.comments.userId',
                foreignField: '_id',
                as: 'commentUsers'
            }
        })

        // Lookup activity users
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'columns.items.activities.userId',
                foreignField: '_id',
                as: 'activityUsers'
            }
        })

        // Project final shape
        pipeline.push({
            $project: {
                _id: '$columns.items._id',
                title: '$columns.items.title',
                status: '$columns.title',
                isCompleted: '$columns.items.isCompleted',
                description: '$columns.items.description',
                priority: '$columns.items.priority',
                labels: '$columns.items.labels',
                dueDate: '$columns.items.dueDate',
                assignees: '$assigneeUsers',
                reporter: { $arrayElemAt: ['$reporterUser', 0] },
                comments: {
                    $map: {
                        input: '$columns.items.comments',
                        as: 'comment',
                        in: {
                            _id: '$$comment._id',
                            user: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$commentUsers',
                                            cond: { $eq: ['$$this._id', '$$comment.userId'] }
                                        }
                                    },
                                    0
                                ]
                            },
                            content: '$$comment.content',
                            files: '$$comment.files',
                            created_at: '$$comment.created_at',
                            editedAt: '$$comment.editedAt'
                        }
                    }
                },
                activities: {
                    $map: {
                        input: '$columns.items.activities',
                        as: 'activity',
                        in: {
                            _id: '$$activity._id',
                            user: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$activityUsers',
                                            cond: { $eq: ['$$this._id', '$$activity.userId'] }
                                        }
                                    },
                                    0
                                ]
                            },
                            action: '$$activity.action',
                            metadata: '$$activity.metadata',
                            created_at: '$$activity.created_at'
                        }
                    }
                },
                created_at: '$columns.items.created_at',
                updated_at: '$columns.items.updated_at'
            }
        })

        const results = await this.taskModel.aggregate(pipeline).exec()

        if (!results || results.length === 0) {
            throw new NotFoundException('Subtask not found')
        }

        return results[0]
    }

    async addComment(
        taskId: string,
        userId: string,
        content: string,
        files?: Express.Multer.File[]
    ): Promise<TaskComment> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const newComment = new TaskComment()
        newComment._id = new mongoose.Types.ObjectId() as any
        newComment.userId = userId
        newComment.content = content

        // Upload files nếu có và lưu FileInfo
        if (files && files.length > 0) {
            const fileInfos: FileInfo[] = []
            for (const file of files) {
                try {
                    // Upload file lên MinIO
                    const folderName = `tasks/${taskId}/comments`
                    const fileUrl = await this.manageMinioProvider.uploadFileToMinio(file, folderName)

                    // Tạo FileInfo object
                    const fileInfo = new FileInfo()
                    fileInfo.name = Buffer.from(file.originalname, 'latin1').toString('utf8')
                    fileInfo.url = fileUrl
                    fileInfo.size = file.size

                    fileInfos.push(fileInfo)
                } catch (error) {
                    console.error('Error uploading file:', error)
                    // Tiếp tục với các file khác
                }
            }
            newComment.files = fileInfos
        }

        task.comments.push(newComment)

        // Thêm activity log
        await this.addActivity(taskId, userId, 'Thêm một bình luận')

        await task.save()

        // Populate user info
        await task.populate('comments.userId', 'fullname email avatar')

        return task.comments[task.comments.length - 1]
    }

    async updateComment(
        taskId: string,
        commentId: string,
        userId: string,
        content: string,
        existingFiles?: any[],
        files?: Express.Multer.File[]
    ): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const comment = task.comments.find((c) => c._id.toString() === commentId)
        if (!comment) {
            throw new NotFoundException('Comment not found')
        }

        if (comment.userId.toString() !== userId) {
            throw new ForbiddenException('You can only edit your own comments')
        }

        comment.content = content
        comment.editedAt = new Date()

        // Handle file updates if files are provided
        if (files || existingFiles !== undefined) {
            const fileInfos: FileInfo[] = []

            // Add existing files that weren't removed
            if (existingFiles && existingFiles.length > 0) {
                fileInfos.push(...existingFiles)
            }

            // Upload and add new files
            if (files && files.length > 0) {
                for (const file of files) {
                    try {
                        const folderName = `tasks/${taskId}/comments`
                        const fileUrl = await this.manageMinioProvider.uploadFileToMinio(file, folderName)

                        const fileInfo = new FileInfo()
                        fileInfo.name = Buffer.from(file.originalname, 'latin1').toString('utf8')
                        fileInfo.url = fileUrl
                        fileInfo.size = file.size

                        fileInfos.push(fileInfo)
                    } catch (error) {
                        console.error('Error uploading file:', error)
                        // Continue with other files
                    }
                }
            }

            comment.files = fileInfos
        }

        // Add activity directly to avoid version conflict
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = 'chỉnh sửa một bình luận'
        task.activities.push(activity)

        await task.save()

        return task
    }

    async deleteComment(taskId: string, commentId: string, userId: string): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const commentIndex = task.comments.findIndex((c) => c._id.toString() === commentId)
        if (commentIndex === -1) {
            throw new NotFoundException('Comment not found')
        }

        if (task.comments[commentIndex].userId.toString() !== userId) {
            throw new ForbiddenException('You can only delete your own comments')
        }

        task.comments.splice(commentIndex, 1)

        // Add activity directly to avoid version conflict
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = 'xóa một bình luận'
        task.activities.push(activity)

        await task.save()

        return task
    }

    async assignUsers(taskId: string, userIds: string[], userId: string): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const oldAssignees = task.assignees.map((id) => id.toString())
        task.assignees = userIds

        // Log activity với thông tin thay đổi
        await this.addActivity(taskId, userId, 'cập nhật phân công', {
            oldAssignees,
            newAssignees: userIds
        })

        await task.save()
        await task.populate('assignees', 'fullName email avatarUrl')

        return task
    }

    async updateDescription(taskId: string, description: string, userId: string): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        task.description = description

        await this.addActivity(taskId, userId, 'updated description')
        await task.save()

        return task
    }

    async updateTaskDetails(taskId: string, updates: any, userId: string): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const changedFields: string[] = []

        if (updates.title !== undefined && updates.title !== task.title) {
            task.title = updates.title
            changedFields.push('title')
        }

        if (updates.description !== undefined && updates.description !== task.description) {
            task.description = updates.description
            changedFields.push('description')
        }

        if (updates.priority !== undefined && updates.priority !== task.priority) {
            task.priority = updates.priority
            changedFields.push('priority')
        }

        if (updates.labels !== undefined) {
            task.labels = updates.labels
            changedFields.push('labels')
        }

        if (updates.dueDate !== undefined) {
            task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
            changedFields.push('dueDate')
        }

        if (updates.assignees !== undefined) {
            task.assignees = updates.assignees
            changedFields.push('assignees')
        }

        if (changedFields.length > 0) {
            await this.addActivity(taskId, userId, `updated ${changedFields.join(', ')}`)
        }

        await task.save()
        await task.populate('assignees', 'fullName email avatarUrl')

        return task
    }

    async addActivity(taskId: string, userId: string, action: string, metadata?: any): Promise<void> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            return
        }

        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = action
        activity.metadata = metadata

        task.activities.push(activity)
    }

    // Subtask comment methods
    async addSubtaskComment(
        taskId: string,
        columnId: string,
        subtaskId: string,
        userId: string,
        content: string,
        files?: Express.Multer.File[]
    ): Promise<TaskComment> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const column = task.columns.find((col) => col._id.toString() === columnId)
        if (!column) {
            throw new NotFoundException('Column not found')
        }

        const subtask = column.items.find((item) => item._id.toString() === subtaskId)
        if (!subtask) {
            throw new NotFoundException('Subtask not found')
        }

        const newComment = new TaskComment()
        newComment._id = new mongoose.Types.ObjectId() as any
        newComment.userId = userId
        newComment.content = content

        // Upload files nếu có
        if (files && files.length > 0) {
            const fileInfos: FileInfo[] = []
            for (const file of files) {
                try {
                    const folderName = `tasks/${taskId}/subtasks/${subtaskId}/comments`
                    const fileUrl = await this.manageMinioProvider.uploadFileToMinio(file, folderName)

                    const fileInfo = new FileInfo()
                    fileInfo.name = Buffer.from(file.originalname, 'latin1').toString('utf8')
                    fileInfo.url = fileUrl
                    fileInfo.size = file.size

                    fileInfos.push(fileInfo)
                } catch (error) {
                    console.error('Error uploading file:', error)
                }
            }
            newComment.files = fileInfos
        }

        subtask.comments.push(newComment)

        // Log activity
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = `Thêm bình luận vào subtask "${subtask.title}"`
        subtask.activities.push(activity)

        await task.save()

        // Populate user info
        // await task.populate(`columns.${column._id}.items.${subtask._id}.comments.userId`, 'fullname email avatar')

        return subtask.comments[subtask.comments.length - 1]
    }

    async updateSubtaskComment(
        taskId: string,
        columnId: string,
        subtaskId: string,
        commentId: string,
        userId: string,
        content: string,
        existingFiles?: any[],
        files?: Express.Multer.File[]
    ): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const column = task.columns.find((col) => col._id.toString() === columnId)
        if (!column) {
            throw new NotFoundException('Column not found')
        }

        const subtask = column.items.find((item) => item._id.toString() === subtaskId)
        if (!subtask) {
            throw new NotFoundException('Subtask not found')
        }

        const comment = subtask.comments.find((c) => c._id.toString() === commentId)
        if (!comment) {
            throw new NotFoundException('Comment not found')
        }

        if (comment.userId.toString() !== userId) {
            throw new ForbiddenException('You can only edit your own comments')
        }

        comment.content = content
        comment.editedAt = new Date()

        // Handle file updates
        if (files || existingFiles !== undefined) {
            const fileInfos: FileInfo[] = []

            if (existingFiles && existingFiles.length > 0) {
                fileInfos.push(...existingFiles)
            }

            if (files && files.length > 0) {
                for (const file of files) {
                    try {
                        const folderName = `tasks/${taskId}/subtasks/${subtaskId}/comments`
                        const fileUrl = await this.manageMinioProvider.uploadFileToMinio(file, folderName)

                        const fileInfo = new FileInfo()
                        fileInfo.name = Buffer.from(file.originalname, 'latin1').toString('utf8')
                        fileInfo.url = fileUrl
                        fileInfo.size = file.size

                        fileInfos.push(fileInfo)
                    } catch (error) {
                        console.error('Error uploading file:', error)
                    }
                }
            }

            comment.files = fileInfos
        }

        // Log activity
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = `Cập nhật bình luận trong subtask "${subtask.title}"`
        subtask.activities.push(activity)

        await task.save()

        return task
    }

    async deleteSubtaskComment(
        taskId: string,
        columnId: string,
        subtaskId: string,
        commentId: string,
        userId: string
    ): Promise<Task> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(taskId))
        if (!task) {
            throw new NotFoundException('Task not found')
        }

        const column = task.columns.find((col) => col._id.toString() === columnId)
        if (!column) {
            throw new NotFoundException('Column not found')
        }

        const subtask = column.items.find((item) => item._id.toString() === subtaskId)
        if (!subtask) {
            throw new NotFoundException('Subtask not found')
        }

        const commentIndex = subtask.comments.findIndex((c) => c._id.toString() === commentId)
        if (commentIndex === -1) {
            throw new NotFoundException('Comment not found')
        }

        const comment = subtask.comments[commentIndex]
        if (comment.userId.toString() !== userId) {
            throw new ForbiddenException('You can only delete your own comments')
        }

        subtask.comments.splice(commentIndex, 1)

        // Log activity
        const activity = new TaskActivity()
        activity._id = new mongoose.Types.ObjectId() as any
        activity.userId = userId
        activity.action = `Xóa bình luận trong subtask "${subtask.title}"`
        subtask.activities.push(activity)

        await task.save()

        return task
    }
}
