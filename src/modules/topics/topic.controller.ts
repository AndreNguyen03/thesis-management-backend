import { Controller, Get, Body, Post, Patch, Param, Delete, Query, Req, HttpStatus } from '@nestjs/common'

import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { TopicService } from './application/topic.service'
import { CreateTopicDto, GetTopicResponseDto, PatchTopicDto } from './dtos'
import { BaseHttpException } from '../../common/exceptions'
import { plainToInstance } from 'class-transformer'

@Controller('topics')
export class TopicController {
    // create endpoint to add thesis
    constructor(private readonly topicService: TopicService) {}
    @Get()
    @Auth(AuthType.Bearer)
    async getTopic() {
        return await this.topicService.getAllTopics()
    }

    @Post()
    @Auth(AuthType.Bearer)
    async createTopic(@Req() req: { user: ActiveUserData }, @Body() topic: CreateTopicDto) {
        if (req.user.role !== 'lecturer') {
            throw new BaseHttpException('Only lecturers can create topics', 'Authen', HttpStatus.FORBIDDEN)
        }
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
    @Get('/get-registered')
    @Auth(AuthType.Bearer)
    async getRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        return await this.topicService.getRegisteredThesis(req.user)
    }
    @Post('/save-topic/:topicId')
    @Auth(AuthType.Bearer)
    async createTopicSaving(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const { sub: userId } = req.user
        return this.topicService.saveTopic(userId, topicId)
    }

    @Delete('/unsave-topic/:topicId')
    @Auth(AuthType.Bearer)
    async unarchiveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const { sub: userId, role } = req.user
        return this.topicService.unSaveTopic(userId, topicId)
    }

    @Get('saved-topics')
    @Auth(AuthType.Bearer)
    async getSavedTopics(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user
        return this.topicService.getSavedTopics(userId, role)
    }

    // @Post('/register-thesis/:thesisId')
    // @Auth(AuthType.Bearer)
    // async createThesisRegistration(@Req() req: { user: ActiveUserData }, @Param('thesisId') thesisId: string) {
    //     // const { sub: userId, role } = req.user
    //     // return await this.topicService.registerForThesis(userId, thesisId, role)
    // }
    // @Delete('/cancel-registration/:thesisId')
    // @Auth(AuthType.Bearer)
    // async cancelRegistration(@Req() req: { user: ActiveUserData }, @Param('thesisId') thesisId: string) {
    //     const { sub: userId, role } = req.user
    //     return await this.topicService.cancelRegistration(userId, thesisId, role)
    // }
    // @Get('/canceled-registrations')
    // @Auth(AuthType.Bearer)
    // async getCanceledRegistration(@Req() req: { user: ActiveUserData }) {
    //     // const { sub: userId, role } = req.user
    //     // return await this.topicService.getCanceledRegistrations(userId, role)
    // }
}
