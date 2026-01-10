import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Auth } from '../../auth/decorator/auth.decorator'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { AuthType } from '../../auth/enum/auth-type.enum'

import { plainToInstance } from 'class-transformer'
import { GetStudentsRegistrationsInTopic } from '../topics/dtos/registration/get-students-in-topic'
import { GetRegistrationInTopicProvider } from './provider/get-registration-in-topic.provider'
import { BodyReplyRegistrationDto } from './dtos/query-reply-registration.dto'
import { PaginationStudentGetHistoryQuery } from './dtos/request.dto'
import { PeriodGateway } from '../periods/gateways/period.gateway'

@Controller('registrations')
export class RegistrationsController {
    constructor(
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly lecturerRegTopicService: LecturerRegTopicService,
        private readonly getRegistrationInTopicProvider: GetRegistrationInTopicProvider,
        private readonly periodGateway: PeriodGateway
    ) {}

    // lấy topic của sinh viên để biết là các trạng thái đã có điểm hay chưa
    @Get('/student/current-period-topic-state')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getStudentTopicState(@Req() req: { user: ActiveUserData }) {
        const res = await this.studentRegTopicService.getStudentTopicStateInPeriod(req.user.sub)
        return res
    }

    //BCN, giảng viên là chủ đề tài
    // assign giảng viên khác vào đề tài
    //cho giảng viên chính
    @Post('/assign-lecturer/:lecturerId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async assigeLecInTopic(
        @Req() req: { user: ActiveUserData },
        @Param('lecturerId') lecturerId: string,
        @Param('topicId') topicId: string
    ) {
        await this.lecturerRegTopicService.createSingleRegistration(lecturerId, topicId)
        return { message: 'Giảng viên đã được phân công vào đề tài' }
    }
    //cho giảng viên chính
    @Delete('/unassign-lecturer/:lecturerId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async unassignLecturerInTopic(
        @Req() req: { user: ActiveUserData },
        @Param('lecturerId') lecturerId: string,
        @Param('topicId') topicId: string
    ) {
        await this.lecturerRegTopicService.unassignLecturerInTopic(req.user, lecturerId, topicId)
        return { message: 'Đã xóa thành công đăng ký' }
    }

    // assign sinh viên khác vào đề tài
    @Post('/assign-student/:studentId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async assignStudentToTopic(
        @Req() req: { user: ActiveUserData },
        @Param('studentId') studentId: string,
        @Param('topicId') topicId: string
    ) {
        await this.studentRegTopicService.lecAssignStudent(studentId, topicId)
        return { message: 'Sinh viên đã được phân công vào đề tài' }
    }

    @Delete('/unassign-student/:studentId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async unassignStudentInTopic(
        @Req() req: { user: ActiveUserData },
        @Param('studentId') studentId: string,
        @Param('topicId') topicId: string
    ) {
        await this.studentRegTopicService.unassignStudentInTopic(req.user, studentId, topicId)
        return { message: 'Đã xóa thành công đăng ký' }
    }
    @Post('/student-register-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async studentRegisterTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const result = await this.studentRegTopicService.studentSingleRegistration(req.user.role, req.user.sub, topicId)
        this.periodGateway.emitPeriodDashboardUpdate({})
        return result
    }
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    @Delete('leave-topic/:topicId')
    async leaveRegistration(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const { sub: userId, role } = req.user
        if (role === 'student') {
            //sinh viên hủy đăng ký đề tài
            const result = await this.studentRegTopicService.cancelRegistration(topicId, userId)
            this.periodGateway.emitPeriodDashboardUpdate({})
            return result
        } else if (role === 'lecturer') {
            //giảng viên rút khỏi đề tài
            const result = await this.lecturerRegTopicService.cancelRegistration(topicId, userId)
            this.periodGateway.emitPeriodDashboardUpdate({})
            return result
        } else {
            throw new Error('Invalid user role')
        }
    }

    @Get('/student/history-registrations')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getStudentHistoryRegistrations(
        @Req() req: { user: ActiveUserData },
        @Query() query: PaginationStudentGetHistoryQuery
    ) {
        return await this.studentRegTopicService.getStudentHistoryRegistrations(req.user.sub, query)
    }

    @Get('/students-registrations-in-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getStudentsRegistrationsInTopic(@Param('topicId') topicId: string) {
        const res = await this.getRegistrationInTopicProvider.getApprovedAndPendingStudentRegistrationsInTopic(topicId)
        return plainToInstance(GetStudentsRegistrationsInTopic, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Patch('lecturer/reply-registration/:registrationId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async replyStudentRegistrationByLecturer(
        @Param('registrationId') registrationId: string,
        @Body() body: BodyReplyRegistrationDto,
        @Req() req: { user: ActiveUserData }
    ) {
        await this.studentRegTopicService.replyStudentRegistrationByLecturer(req.user.sub, registrationId, body)
        this.periodGateway.emitPeriodDashboardUpdate({})
        return { message: 'Đăng ký của sinh viên đã được giảng viên phê duyệt' }
    }
}
