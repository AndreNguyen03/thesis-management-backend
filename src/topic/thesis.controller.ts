import { Controller, Get, Body, Post, Patch, Param, Delete, Query, Req } from '@nestjs/common'
import { TopicService } from './application/topic.service'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { CreateTopicDto } from './dtos/createTopic.dto'
import { PatchTopicDto, ReplyRegistrationDto } from './dtos'
import { ActiveUserData } from '../auth/interface/active-user-data.interface'
import { WrongRoleException } from '../common/exceptions'
import { UpdateTopicDto } from './dtos/topic.dtos'
@Controller('theses')
export class TopicController {
    // create endpoint to add Topic
    constructor(private readonly TopicService: TopicService) {}
    @Get('/get-registered')
    @Auth(AuthType.Bearer)
    async getRegisteredTheses(@Req() req: { user: ActiveUserData }) {
        return await this.TopicService.getRegisteredTopic(req.user)
    }

    @Post('/save-Topic/:TopicId')
    @Auth(AuthType.Bearer)
    async createTopicSaving(@Req() req: { user: ActiveUserData }, @Param('TopicId') TopicId: string) {
        const { sub: userId, role } = req.user
        return this.TopicService.saveTopic(userId, role, TopicId)
    }

    @Patch('/unsave-Topic/:TopicId')
    @Auth(AuthType.Bearer)
    async unarchiveTopic(@Req() req: { user: ActiveUserData }, @Param('TopicId') TopicId: string) {
        const { sub: userId, role } = req.user
        return this.TopicService.unarchiveTopic(userId, TopicId, role)
    }

    @Get('saved-theses')
    @Auth(AuthType.Bearer)
    async getSavedTheses(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user
        return this.TopicService.getSavedTheses(userId, role)
    }

    @Post('save')
    @Auth(AuthType.None)
    async saveTopic(@Body('userId') userId: string, @Body('role') role: string, @Body('TopicId') TopicId: string) {
        return this.TopicService.saveTopic(userId, role, TopicId)
    }

    @Get()
    @Auth(AuthType.Bearer)
    async getTheses(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user

        return await this.TopicService.getAllTheses(userId, role)
    }

    @Post()
    @Auth(AuthType.None)
    async createTopic(@Body() Topic: CreateTopicDto) {
        return await this.TopicService.createTopic(Topic)
    }

    @Patch(':id')
    @Auth(AuthType.None)
    async updateTopic(@Param('id') id: string, @Body() Topic: UpdateTopicDto) {
        return await this.TopicService.updateTopic(id, Topic)
    }

    @Delete('/delete/:id')
    @Auth(AuthType.None)
    async deleteTopic(@Param('id') id: string) {
        return await this.TopicService.deleteTopic(id)
    }

    @Post('/register-Topic/:TopicId')
    @Auth(AuthType.Bearer)
    async createTopicRegistration(@Req() req: { user: ActiveUserData }, @Param('TopicId') TopicId: string) {
        const { sub: userId, role } = req.user
        return await this.TopicService.registerForTopic(userId, TopicId, role)
    }
    @Delete('/cancel-registration/:TopicId')
    @Auth(AuthType.Bearer)
    async cancelRegistration(@Req() req: { user: ActiveUserData }, @Param('TopicId') TopicId: string) {
        const { sub: userId, role } = req.user
        return await this.TopicService.cancelRegistration(userId, TopicId, role)
    }
    @Get('/canceled-registrations')
    @Auth(AuthType.Bearer)
    async getCanceledRegistration(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user
        return await this.TopicService.getCanceledRegistrations(userId, role)
    }

    // @Patch('/lecturer/reply-registration')
    // @Auth(AuthType.Bearer)
    // public async lecturerReplyRegistration(
    //     @Req() req: { user: ActiveUserData },
    //     @Body() replyRegistrationDto: ReplyRegistrationDto
    // ) {
    //     const { sub: userId, role } = req.user
    //     if (role !== 'lecturer') {
    //         throw new WrongRoleException('register Topic, feature is only for lecturer')
    //     }
    //     return await this.TopicService.lecturerReplyRegistration(userId, replyRegistrationDto)
    // }
}
