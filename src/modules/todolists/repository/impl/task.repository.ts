import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Subtask, Task, TaskColumn } from '../../schemas/task.schema'
import { ITaskRepository } from '../task.repository.interface'
import mongoose, { Model } from 'mongoose'
import { ObjectId } from 'mongodb'
import { RequestCreate } from '../../dtos/request-update.dtos'
import { TaskColumnTitleEnum } from '../../enum/taskcolumn.enum'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { MoveInColumnQuery, MoveToColumnQuery } from '../../dtos/request-patch.dtos'
export class TaskRepository extends BaseRepositoryAbstract<Task> implements ITaskRepository {
    constructor(@InjectModel(Task.name) private readonly taskModel: Model<Task>) {
        super(taskModel)
    }
    async getTaskByGroupId(groupId: string): Promise<Task[]> {
        return await this.taskModel
            .find({ groupId: new mongoose.Types.ObjectId(groupId), deleted_at: null })
            .sort({ createdAt: 1 })
            .exec()
    }
    async createTask(body: RequestCreate): Promise<Task> {
        //console.log('body repo', body)
        const defaultColumns = [
            TaskColumnTitleEnum.TO_DO,
            TaskColumnTitleEnum.IN_PROGRESS,
            TaskColumnTitleEnum.DONE
        ].map((title) => ({ title }))
        const newTask = new this.taskModel({
            groupId: new mongoose.Types.ObjectId('6578f1a1e4b0d1c2a3b4c5f1'),
            title: body.title,
            description: body.description || '',
            columns: defaultColumns
        })
        return await newTask.save()
    }
    async deleteTask(id: string): Promise<string> {
        const res = await this.taskModel.deleteOne({ _id: new mongoose.Types.ObjectId(id) }).exec()
        if (res.deletedCount === 0) {
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
}
