import { Injectable } from '@nestjs/common'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { Subtask, Task, TaskColumn } from '../schemas/task.schema'
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
}
