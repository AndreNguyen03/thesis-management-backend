import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Subtask, Task, TaskColumn } from '../../schemas/task.schema'
import { ITaskRepository } from '../task.repository.interface'
import mongoose, { Model } from 'mongoose'
import { ObjectId } from 'mongodb'
import { RequestCreate } from '../../dtos/request-update.dtos'
import { TaskColumnTitleEnum } from '../../enum/taskcolumn.enum'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { MoveInColumnQuery, MoveToColumnQuery } from '../../dtos/request-patch.dtos'
import { pipe } from 'rxjs'
import { Milestone } from '../../../milestones/schemas/milestones.schemas'
import { Group } from '../../../groups/schemas/groups.schemas'

export class TaskRepository extends BaseRepositoryAbstract<Task> implements ITaskRepository {
    constructor(
        @InjectModel(Task.name) private readonly taskModel: Model<Task>,
        @InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>,
        @InjectModel(Group.name) private readonly groupModel: Model<Group>
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
            { $sort: { createdAt: 1 } }
        )

        pipeline.push({
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
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
    async createTask(body: RequestCreate): Promise<Task> {
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
            columns: defaultColumns
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
    async createNewSubtask(id: string, columnId: string, title: string): Promise<Subtask> {
        const task = await this.taskModel.findById(new mongoose.Types.ObjectId(id))
        if (!task) {
            throw new BadRequestException('Nhiệm vụ không tồn tại')
        }
        let newSubTask = new Subtask()
        newSubTask._id = new mongoose.Types.ObjectId() as any
        console.log('Creating subtask with title:', newSubTask)
        task?.columns.forEach((column) => {
            if (column._id.toString() === columnId) {
                newSubTask.title = title
                newSubTask.isCompleted = false
                newSubTask.deleted_at = null
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

        if (milestone.groupId.toString() !== task.groupId.toString()) {
            throw new BadRequestException('Milestone does not belong to the same group')
        }

        // 5. Cập nhật
        task.milestoneId = milestoneId
        await task.save()

        // 6. Populate milestone info trước khi return
        await task.populate('milestoneId')

        return task
    }
}
