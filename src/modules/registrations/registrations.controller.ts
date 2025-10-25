import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from './repository/student-reg-topic.repository.interface'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { CreateRegistrationLecturerDto } from './dtos/create-registration-lecturer.dto'

@Controller('registrations')
export class RegistrationsController {
    constructor(
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly lecturerRegTopicService: LecturerRegTopicService
    ) {}

    @Post('register-topic/:topicId')
    async registerTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const { sub: userId, role } = req.user
        if (role === 'student') {
            return this.studentRegTopicService.createSingleRegistration(userId, topicId)
        } else if (role === 'lecturer') {
            return this.lecturerRegTopicService.createSingleRegistration(userId, topicId)
        } else {
            throw new Error('Invalid user role')
        }
    }
    @Get('registered-topics')
    async getRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user
        if (role === 'student') {
            return this.studentRegTopicService.getRegisteredTopics(userId)
        } else if (role === 'lecturer') {
            return this.lecturerRegTopicService.getRegisteredTopics(userId)
        } else {
            throw new Error('Invalid user role')
        }
    }

    @Get('canceled-registrations')
    async getCanceledRegistrations(@Req() req: { user: ActiveUserData }) {
        const { sub: userId, role } = req.user
        if (role === 'student') {
            return this.studentRegTopicService.getCanceledRegistrations(userId)
        } else if (role === 'lecturer') {
            return this.lecturerRegTopicService.getCanceledRegistrations(userId)
        } else {
            throw new Error('Invalid user role')
        }
    }
    @Delete('cancel-registration/:topicId')
    async cancelRegistration(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const { sub: userId, role } = req.user
        if (role === 'student') {
            return this.studentRegTopicService.cancelRegistration(topicId, userId)
        } else if (role === 'lecturer') {
            return this.lecturerRegTopicService.cancelRegistration(topicId, userId)
        } else {
            throw new Error('Invalid user role')
        }
    }
}
