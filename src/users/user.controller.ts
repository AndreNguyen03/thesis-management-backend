import { Controller, Get, Param, Patch, Body, Req, Post, Query, Delete, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { StudentService } from './application/student.service'
import { LecturerService } from './application/lecturer.service'
import { AdminService } from './application/admin.service'
import { CreateStudentDto, UpdateStudentTableDto } from './dtos/student.dto'
import { UpdateAdminDto } from './dtos/admin.dto'
import { CreateLecturerDto, UpdateLecturerProfileDto, UpdateLecturerTableDto } from './dtos/lecturer.dto'
import { UserService } from './application/users.service'
import { PaginationQueryDto } from '../common/pagination/dtos/pagination-query.dto'

@Controller('users')
@ApiTags('Users')
@Auth(AuthType.Bearer)
export class UserController {
    constructor(
        private readonly studentService: StudentService,
        private readonly lecturerService: LecturerService,
        private readonly adminService: AdminService,
        private readonly userService: UserService
    ) {}

    @Get(':role/:id')
    async getUser(@Param('role') role: string, @Param('id') id: string) {
        return this.getUserByRoleAndId(role, id)
    }

    @Get('profile')
    async getMyProfile(@Req() req) {
        const { sub: id, role } = req.user
        return this.getUserByRoleAndId(role, id)
    }

    private async getUserByRoleAndId(role: string, id: string) {
        let user
        switch (role) {
            case 'student':
                user = await this.studentService.getById(id)
                if (!user) return null
                user = this.studentService.toResponseStudentProfile(user)
                return user
            case 'lecturer':
                user = await this.lecturerService.getById(id)
                return user ? this.lecturerService.toResponseLecturerProfile(user) : null
            case 'admin':
                user = await this.adminService.getById(id)
                return user ? this.adminService.toResponseDto(user) : null
            default:
                throw new Error('Invalid role')
        }
    }
    @Get('studnt/:id/saved-theses')
    async getStudentSavedTheses(@Param('id') id: string) {}

    // @Patch('student/:id')
    // async updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    //     return this.studentService.update(id, dto)
    // }

    @Patch('admin/:id')
    async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
        return this.adminService.updateAdmin(id, dto)
    }

    @Patch('lecturers/profile/:id')
    async updateLecturerProfile(@Param('id') id: string, @Body() dto: UpdateLecturerProfileDto) {
        const updated = await this.lecturerService.updateLecturerProfile(id, dto)
        return updated ? { message: 'Cập nhật thành công' } : { message: 'Cập nhật thất bại' }
    }

    // lecturer endpoint
    @Patch('lecturers/:id')
    async updateLecturerAdmin(@Param('id') id: string, @Body() dto: UpdateLecturerTableDto) {
        const updated = await this.lecturerService.updateLecturerAdmin(id, dto)
        return updated ? { message: 'Cập nhật thành công' } : { message: 'Cập nhật thất bại' }
    }

    @Post('lecturers')
    async createLecturer(@Body() createLecturerDto: CreateLecturerDto) {
        return this.lecturerService.createLecturerTransaction(createLecturerDto)
    }

    @Get('lecturers')
    async getLecturer(@Query() query: PaginationQueryDto) {
        return await this.lecturerService.getAllLecturers(query)
    }

    @Delete('lecturers/:id')
    async deleteLecturer(@Param('id') id: string) {
        return this.lecturerService.removeLecturerById(id)
    }

    // student endpoint
    @Patch('students/:id')
    async updateStudentAdmin(@Param('id') id: string, @Body() dto: UpdateStudentTableDto) {
        const updated = await this.studentService.updateStudentAdmin(id, dto)
        return updated ? { message: 'Cập nhật thành công' } : { message: 'Cập nhật thất bại' }
    }

    @Post('students')
    async createStudent(@Body() createStudentDto: CreateStudentDto) {
        return this.studentService.createStudentTransaction(createStudentDto)
    }

    @Get('students')
    async getStudents(@Query() query: PaginationQueryDto) {
        return await this.studentService.getAllStudents(query)
    }

    @Delete('students/:id')
    async deleteStudent(@Param('id') id: string) {
        return this.studentService.removeStudentById(id)
    }

    @Post('/department-board')
    async createDepartmentBoard(@Body() dto: CreateDepartmentBoardDto) {    
        return this.adminService.createDepartmentBoard(dto)
    }
