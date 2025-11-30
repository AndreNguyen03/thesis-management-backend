import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Auth } from '../../auth/decorator/auth.decorator'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'

import { plainToInstance } from 'class-transformer'
import { GetPaginatedStudentRegistrationsHistory } from './dtos/get-history-registration.dto'
import { GetStudentsRegistrationsInTopic } from '../topics/dtos/registration/get-students-in-topic'
import { GetRegistrationInTopicProvider } from './provider/get-registration-in-topic.provider'
import { BodyReplyRegistrationDto } from './dtos/query-reply-registration.dto'

@Controller('registrations')
export class RegistrationsController {
    constructor(
        private readonly studentRegTopicService: StudentRegTopicService,
        private readonly lecturerRegTopicService: LecturerRegTopicService,
        private readonly getRegistrationInTopicProvider: GetRegistrationInTopicProvider
    ) {}

    //BCN, giảng viên là chủ đề tài
    // assign giảng viên khác vào đề tài
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

    @Delete('/unassign-lecturer/:lecturerId/in/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async unassignLecturerInTopic(
        @Req() req: { user: ActiveUserData },
        @Param('lecturerId') lecturerId: string,
        @Param('topicId') topicId: string
    ) {
        await this.lecturerRegTopicService.unassignLecturerInTopic(lecturerId, topicId)
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
        await this.studentRegTopicService.unassignStudentInTopic(studentId, topicId)
        return { message: 'Đã xóa thành công đăng ký' }
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

    @Get('/student/history-registrations')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getStudentHistoryRegistrations(
        @Req() req: { user: ActiveUserData },
        @Query() query: PaginationQueryDto
    ): Promise<GetPaginatedStudentRegistrationsHistory> {
        const res = await this.studentRegTopicService.getStudentHistoryRegistrations(req.user.sub, query)
        return plainToInstance(GetPaginatedStudentRegistrationsHistory, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
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
        console.log('registrationId', registrationId)
        await this.studentRegTopicService.replyStudentRegistrationByLecturer(req.user.sub, registrationId, body)
        return { message: 'Đăng ký của sinh viên đã được giảng viên phê duyệt' }
    }
}
