import { Injectable } from '@nestjs/common'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { Subtask, Task, TaskColumn, TaskComment, TaskActivity } from '../schemas/task.schema'
import { RequestCreate } from '../dtos/request-update.dtos'
import { MoveInColumnQuery, MoveToColumnQuery } from '../dtos/request-patch.dtos'

export interface ITaskRepository extends BaseRepositoryInterface<Task> {
    getTasks(groupId: string, milestoneId?: string): Promise<Task[]>
    createTask(body: RequestCreate): Promise<Task>
    deleteTask(id: string): Promise<string>
    createNewSubtask(id: string, columnId: string, title: string): Promise<Subtask>
    deleteSubtask(id: string, columnId: string, subtaskId: string): Promise<string>
    // updateColumnsInTask(taskId: string, columns: TaskColumn[]): Promise<Task>
    moveInColumn(id: string, columnId: string, query: MoveInColumnQuery): Promise<void>
    moveToNewColumn(id: string, body: MoveToColumnQuery): Promise<void>
    updateTaskMilestone(taskId: string, milestoneId: string | null, userId: string): Promise<Task>

    // Jira-like features
    getTaskDetail(taskId: string): Promise<Task>
    addComment(taskId: string, userId: string, content: string, files?: Express.Multer.File[]): Promise<TaskComment>
    updateComment(
        taskId: string,
        commentId: string,
        userId: string,
        content: string,
        existingFiles?: any[],
        files?: Express.Multer.File[]
    ): Promise<Task>
    deleteComment(taskId: string, commentId: string, userId: string): Promise<Task>
    assignUsers(taskId: string, userIds: string[], userId: string): Promise<Task>
    updateDescription(taskId: string, description: string, userId: string): Promise<Task>
    updateTaskDetails(taskId: string, updates: any, userId: string): Promise<Task>
    addActivity(taskId: string, userId: string, action: string, metadata?: any): Promise<void>
}
