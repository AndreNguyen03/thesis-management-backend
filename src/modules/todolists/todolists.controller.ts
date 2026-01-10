import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UploadedFiles,
    UseInterceptors
} from '@nestjs/common'
import { TasksService } from './application/tasks.service'
import { RequestGetTaskQuery } from './dtos/request-get.dto'
import { RequestCreate, RequestUpdate, UpdateTaskColumn } from './dtos/request-update.dtos'
import { plainToInstance } from 'class-transformer'
import { TaskDto } from './dtos/get.dtos'
import {
    MoveInColumnQuery,
    MoveToColumnQuery,
    UpdateStatus,
    UpdateTaskMilestoneDto,
    UpdateSubtaskDto
} from './dtos/request-patch.dtos'
import { ActiveUser } from '../../auth/decorator/active-user.decorator'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import {
    AddCommentDto,
    AssignUsersDto,
    UpdateCommentDto,
    UpdateDescriptionDto,
    UpdateTaskDetailDto
} from './dtos/task-detail.dto'
import { TaskDetailDto } from './dtos/task-detail-response.dto'
import { FilesInterceptor } from '@nestjs/platform-express'

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

    //Cập nhật subtask
    @Patch('/:id/columns/:columnId/subtasks/:subtaskId')
    async updateSubtask(
        @Param('id') id: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string,
        @Body() body: UpdateSubtaskDto,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.updateSubtask(id, columnId, subtaskId, body, userId)
    }

    //Toggle complete subtask
    @Patch('/:id/columns/:columnId/subtasks/:subtaskId/toggle')
    async toggleSubtaskComplete(
        @Param('id') id: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.toggleSubtaskComplete(id, columnId, subtaskId, userId)
    }

    // Thêm comment vào subtask
    @Post('/:id/columns/:columnId/subtasks/:subtaskId/comments')
    @UseInterceptors(FilesInterceptor('files', 10))
    async addSubtaskComment(
        @Param('id') taskId: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string,
        @Body() body: AddCommentDto,
        @UploadedFiles() files: Express.Multer.File[],
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.addSubtaskComment(taskId, columnId, subtaskId, userId, body, files)
    }

    // Cập nhật comment của subtask
    @Patch('/:id/columns/:columnId/subtasks/:subtaskId/comments/:commentId')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            limits: { fileSize: 50 * 1024 * 1024 }
        })
    )
    async updateSubtaskComment(
        @Param('id') taskId: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string,
        @Param('commentId') commentId: string,
        @Body() body: UpdateCommentDto,
        @ActiveUser('sub') userId: string,
        @UploadedFiles() files?: Express.Multer.File[]
    ) {
        return await this.tasksService.updateSubtaskComment(taskId, columnId, subtaskId, commentId, userId, body, files)
    }

    // Xóa comment của subtask
    @Delete('/:id/columns/:columnId/subtasks/:subtaskId/comments/:commentId')
    async deleteSubtaskComment(
        @Param('id') taskId: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string,
        @Param('commentId') commentId: string,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.deleteSubtaskComment(taskId, columnId, subtaskId, commentId, userId)
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

    // ==================== JIRA-LIKE FEATURES ====================

    // Lấy chi tiết task (giống modal Jira)
    @Get('/:id/detail')
    async getTaskDetail(@Param('id') taskId: string) {
        const task = await this.tasksService.getTaskDetail(taskId)
        return plainToInstance(TaskDetailDto, task, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    // Lấy chi tiết subtask
    @Get('/:id/columns/:columnId/subtasks/:subtaskId/detail')
    async getSubtaskDetail(
        @Param('id') taskId: string,
        @Param('columnId') columnId: string,
        @Param('subtaskId') subtaskId: string
    ) {
        return await this.tasksService.getSubtaskDetail(taskId, columnId, subtaskId)
    }

    // Cập nhật thông tin chi tiết task (title, description, priority, labels, dueDate, assignees)
    @Patch('/:id/detail')
    async updateTaskDetails(
        @Param('id') taskId: string,
        @Body() body: UpdateTaskDetailDto,
        @ActiveUser('sub') userId: string
    ) {
        const task = await this.tasksService.updateTaskDetails(taskId, userId, body)
        return plainToInstance(TaskDetailDto, task, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    // Thêm comment
    @Post('/:id/comments')
    @UseInterceptors(FilesInterceptor('files', 10)) // Tối đa 10 files
    async addComment(
        @Param('id') taskId: string,
        @Body() body: AddCommentDto,
        @UploadedFiles() files: Express.Multer.File[],
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.addComment(taskId, userId, body, files)
    }

    // Cập nhật comment
    @Patch('/:id/comments/:commentId')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            limits: { fileSize: 50 * 1024 * 1024 }
        })
    )
    async updateComment(
        @Param('id') taskId: string,
        @Param('commentId') commentId: string,
        @Body() body: UpdateCommentDto,
        @ActiveUser('sub') userId: string,
        @UploadedFiles() files?: Express.Multer.File[]
    ) {
        return await this.tasksService.updateComment(taskId, commentId, userId, body, files)
    }

    // Xóa comment
    @Delete('/:id/comments/:commentId')
    async deleteComment(
        @Param('id') taskId: string,
        @Param('commentId') commentId: string,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.deleteComment(taskId, commentId, userId)
    }

    // Assign/unassign users
    @Patch('/:id/assignees')
    async assignUsers(@Param('id') taskId: string, @Body() body: AssignUsersDto, @ActiveUser('sub') userId: string) {
        const task = await this.tasksService.assignUsers(taskId, userId, body)
        return plainToInstance(TaskDetailDto, task, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    // Cập nhật description (có thể dùng rich text editor)
    @Patch('/:id/description')
    async updateDescription(
        @Param('id') taskId: string,
        @Body() body: UpdateDescriptionDto,
        @ActiveUser('sub') userId: string
    ) {
        return await this.tasksService.updateDescription(taskId, userId, body)
    }
}
