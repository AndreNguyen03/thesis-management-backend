import { Controller, Get, Body, Post, Patch, Param, Delete, Query, Req, HttpStatus } from '@nestjs/common'

import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { TopicService } from './application/topic.service'
import {
    CreateTopicDto,
    GetCancelRegisteredTopicResponseDto,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    PatchTopicDto
} from './dtos'
import { BaseHttpException } from '../../common/exceptions'
import { plainToInstance } from 'class-transformer'

@Controller('topics')
export class TopicController {
    // create endpoint to add thesis
    constructor(private readonly topicService: TopicService) {}
    @Get()
    @Auth(AuthType.Bearer)
    async getTopicList(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getAllTopics(req.user.sub)
        return plainToInstance(GetTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/saved-topics')
    @Auth(AuthType.Bearer)
    async getSavedTopics(@Req() req: { user: ActiveUserData }) {
        const savedTopics = await this.topicService.getSavedTopics(req.user.sub)
        return plainToInstance(GetTopicResponseDto, savedTopics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/registered-topics')
    @Auth(AuthType.Bearer)
    async getRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getRegisteredTopics(req.user.sub)
        return plainToInstance(GetTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/canceled-registered-topics')
    @Auth(AuthType.Bearer)
    async getCanceledRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getCanceledRegisteredTopics(req.user.sub, req.user.role)
        return plainToInstance(GetCancelRegisteredTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/:topicId')
    @Auth(AuthType.Bearer)
    async getTopicById(@Param('topicId') topicId: string, @Req() req: { user: ActiveUserData }) {
        const topic = await this.topicService.getTopicById(topicId, req.user.sub, req.user.role)
        return plainToInstance(GetTopicDetailResponseDto, topic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Post()
    @Auth(AuthType.Bearer)
    async createTopic(@Req() req: { user: ActiveUserData }, @Body() topic: CreateTopicDto) {
        if (req.user.role !== 'lecturer') {
            throw new BaseHttpException('Only lecturers can create topics', 'Authen', HttpStatus.FORBIDDEN)
        }
        topic.createBy = req.user.sub
        const newTopic = await this.topicService.createTopic(req.user.sub, topic)
        return newTopic
    }

    @Patch(':topicId')
    @Auth(AuthType.None)
    async updateTopic(@Param('topicId') id: string, @Body() topic: PatchTopicDto) {
        return await this.topicService.updateTopic(id, topic)
    }

    @Delete('/delete/:topicId')
    @Auth(AuthType.None)
    async deleteTopic(@Param('topicId') id: string) {
        return await this.topicService.deleteThesis(id)
    }

    @Post('/save-topic/:topicId')
    @Auth(AuthType.Bearer)
    async saveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.assignSaveTopic(req.user.sub, topicId)
    }

    @Delete('/unsave-topic/:topicId')
    @Auth(AuthType.Bearer)
    async unSaveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.unassignSaveTopic(req.user.sub, topicId)
    }
}
