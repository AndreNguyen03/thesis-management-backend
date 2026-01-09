import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ITaskRepository } from '../repository/task.repository.interface'
import { RequestGetTaskQuery } from '../dtos/request-get.dto'
import { RequestCreate, RequestUpdate, UpdateTaskColumn } from '../dtos/request-update.dtos'
import { MoveInColumnQuery, MoveToColumnQuery, UpdateStatus } from '../dtos/request-patch.dtos'
import {
    AddCommentDto,
    AssignUsersDto,
    UpdateCommentDto,
    UpdateDescriptionDto,
    UpdateTaskDetailDto
} from '../dtos/task-detail.dto'

@Injectable()
export class TasksService {
    constructor(@Inject('ITaskRepository') private readonly taskInterface: ITaskRepository) {}

    async getTaskBody(query: RequestGetTaskQuery) {
        return await this.taskInterface.getTasks(query.groupId, query.milestoneId)
    }

    async createTask(body: RequestCreate) {
        return await this.taskInterface.createTask(body)
    }

    async updateTaskInfo(id: string, body: RequestUpdate) {
        const res = await this.taskInterface.update(id, body)
        if (!res) {
            throw new NotFoundException('Nhiệm vụ không tồn tại')
        }
        return res
    }

    async updateStatus(id: string, query: UpdateStatus) {
        const res = await this.taskInterface.update(id, query)
        if (!res) {
            throw new NotFoundException('Nhiệm vụ không tồn tại')
        }
        return res
    }

    async deleteTask(id: string) {
        return await this.taskInterface.deleteTask(id)
    }

    async createSubtask(id: string, columnId: string, body: { title: string }) {
        const subtaskId = await this.taskInterface.createNewSubtask(id, columnId, body.title)
        return subtaskId
    }

    async deleteSubtask(id: string, columnId: string, subtaskId: string) {
        return await this.taskInterface.deleteSubtask(id, columnId, subtaskId)
    }

    async updateColumnInTask(id: string, body: UpdateTaskColumn) {
        //  return await this.taskInterface.updateColumnsInTask(id,body.columns)
    }

    async moveInColumn(id: string, columnId: string, query: MoveInColumnQuery) {
        await this.taskInterface.moveInColumn(id, columnId, query)
    }

    async moveToNewColumn(id: string, body: MoveToColumnQuery) {
        await this.taskInterface.moveToNewColumn(id, body)
    }

    async updateTaskMilestone(taskId: string, milestoneId: string | null, userId: string) {
        return await this.taskInterface.updateTaskMilestone(taskId, milestoneId, userId)
    }

    // ==================== JIRA-LIKE FEATURES ====================

    async getTaskDetail(taskId: string) {
        return await this.taskInterface.getTaskDetail(taskId)
    }

    async addComment(taskId: string, userId: string, body: AddCommentDto, files?: Express.Multer.File[]) {
        return await this.taskInterface.addComment(taskId, userId, body.content, files)
    }

    async updateComment(
        taskId: string,
        commentId: string,
        userId: string,
        body: UpdateCommentDto,
        files?: Express.Multer.File[]
    ) {
        return await this.taskInterface.updateComment(
            taskId,
            commentId,
            userId,
            body.content,
            body.existingFiles,
            files
        )
    }

    async deleteComment(taskId: string, commentId: string, userId: string) {
        return await this.taskInterface.deleteComment(taskId, commentId, userId)
    }

    async assignUsers(taskId: string, userId: string, body: AssignUsersDto) {
        return await this.taskInterface.assignUsers(taskId, body.userIds, userId)
    }

    async updateDescription(taskId: string, userId: string, body: UpdateDescriptionDto) {
        return await this.taskInterface.updateDescription(taskId, body.description, userId)
    }

    async updateTaskDetails(taskId: string, userId: string, body: UpdateTaskDetailDto) {
        return await this.taskInterface.updateTaskDetails(taskId, body, userId)
    }
}
