import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { TasksService } from './application/tasks.service'
import { RequestGetTaskQuery } from './dtos/request-get.dto'
import { RequestCreate, RequestUpdate, UpdateTaskColumn } from './dtos/request-update.dtos'
import { plainToInstance } from 'class-transformer'
import { TaskDto } from './dtos/get.dtos'
import { MoveInColumnQuery, MoveToColumnQuery, UpdateStatus, UpdateTaskMilestoneDto } from './dtos/request-patch.dtos'
import { ActiveUser } from '../../auth/decorator/active-user.decorator'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('tasks')
export class TodolistsController {
    constructor(private readonly tasksService: TasksService) {}
    //cập nhật thông tin chung
    @Patch('updateInfo/:id')
    async updateTaskInfo(@Param('id') id: string, @Body() body: RequestUpdate) {
        console.log('Updating task with ID:', id, 'and body:', body)
        return await this.tasksService.updateTaskInfo(id, body)
    }

    @Patch('updateStatus/:id')
    async updateStatus(@Param('id') id: string, @Query() query: UpdateStatus) {
        return await this.tasksService.updateStatus(id, query)
    }

    @Patch('/:id/columns/:columnId/move')
    async moveInColumn(
        @Param('id') id: string,
        @Param('columnId') columnId: string,
        @Query() query: MoveInColumnQuery
    ) {
        console.log('Updating moveinvolumntask withmpove ID:', id, 'and body:')

        return await this.tasksService.moveInColumn(id, columnId, query)
    }
    //---Quản lý các task---
    //lấy danh sách các task theo topicId
    @Get()
    async getTasks(@Query() query: RequestGetTaskQuery) {
        return await this.tasksService.getTaskBody(query)
    }
    //tạo task mới - tự động init ba cột mặc định
    @Post()
    async createTask(@Body() body: RequestCreate) {
        const res = await this.tasksService.createTask(body)
        return plainToInstance(TaskDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Patch('/:id/move')
    async moveToNewColumn(@Param('id') id: string, @Body() body: MoveToColumnQuery) {
        return await this.tasksService.moveToNewColumn(id, body)
    }

    //xóa task
    @Delete('/:id')
    async deleteTask(@Param('id') id: string) {
        return await this.tasksService.deleteTask(id)
    }

    //--Quản lý các cột trong task---Tương tác với bản kanban
    @Put('/:id/columns')
    async updateTaskColumns(@Query('id') id: string, @Body() body: UpdateTaskColumn) {
        //return await this.tasksService.updateColumnInTask(id, body)
    }

    //--Quản lý các subtask trong cột ---
    //Tạo subtask
    @Post('/:id/columns/:columnId/subtasks')
    async createSubtask(@Param('id') id: string, @Param('columnId') columnId: string, @Body() body: { title: string }) {
        return await this.tasksService.createSubtask(id, columnId, body)
    }

    //Xáo subtask
    @Delete('/:id/columns/:columnId/subtasks/:subtaskId')
    async deleteSubtask(
        @Param('id') id: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string
    ) {
        return await this.tasksService.deleteSubtask(id, columnId, subtaskId)
    }

    //Cập nhật milestone cho task
    @Patch('/:taskId/milestone')
    async updateTaskMilestone(
        @Param('taskId') taskId: string,
        @Body() body: UpdateTaskMilestoneDto,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.updateTaskMilestone(taskId, body.milestoneId, userId)
    }
}
