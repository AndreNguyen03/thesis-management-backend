import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from './repository/student-reg-topic.repository.interface'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { CreateRegistrationLecturerDto } from './dtos/create-registration-lecturer.dto'
import { IsOptional } from 'class-validator'
import { Auth } from '../../auth/decorator/auth.decorator'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { U } from '@faker-js/faker/dist/airline-CLphikKp'

@Controller('registrations')
export class RegistrationsController {
    constructor(
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly lecturerRegTopicService: LecturerRegTopicService
    ) {}

    //BCN, giảng viên là chủ đề tài
    // assign giảng viên khác vào đề tài
    @Post('/assign-lecturer/:lecturerId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async lecRegisterTopic(
        @Req() req: { user: ActiveUserData },
        @Param('lecturerId') lecturerId: string,
        @Param('topicId') topicId: string
    ) {
        await this.lecturerRegTopicService.createSingleRegistration(lecturerId, topicId)
        return { message: 'Giảng viên đã được phân công vào đề tài' }
    }

    @Post('/student-register-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async studentRegisterTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return this.studentRegTopicService.createSingleRegistration(req.user.sub, topicId)
    }
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.STUDENT)
    @UseGuards(RolesGuard)
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
