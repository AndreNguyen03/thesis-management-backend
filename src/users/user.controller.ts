import {
    Controller,
    Get,
    Param,
    Patch,
    Body,
    Req,
    Post,
    Query,
    Delete,
    UseInterceptors,
    UploadedFile,
    UseGuards
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { StudentService } from './application/student.service'
import { LecturerService } from './application/lecturer.service'
import { AdminService } from './application/admin.service'
import {
    CreateBatchStudentDto,
    CreateStudentDto,
    PaginatedMiniStudent,
    PaginatedStudentTable,
    UpdateStudentProfileDto,
    UpdateStudentTableDto
} from './dtos/student.dto'
import { UpdateAdminDto } from './dtos/admin.dto'
import {
    CreateBatchLecturerDto,
    CreateLecturerDto,
    PaginatedMiniLecturer,
    PaginatedTableLecturer,
    UpdateLecturerProfileDto,
    UpdateLecturerTableDto
} from './dtos/lecturer.dto'
import { UserService } from './application/users.service'
import { PaginationQueryDto as PaginationAn } from '../common/pagination-an/dtos/pagination-query.dto'
import { CreateFacultyBoardDto } from './dtos/faculty-board.dto'
import { FacultyBoardService } from './application/faculty-board.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { Roles } from '../auth/decorator/roles.decorator'
import { UserRole } from './enums/user-role'
import { ActiveUserData } from '../auth/interface/active-user-data.interface'
import { plainToInstance } from 'class-transformer'
import { RolesGuard } from '../auth/guards/roles/roles.guard'
import { RequestGetLecturerDto, RequestGetStudentDto } from './dtos/request-get.dto'
import { PaginatedSearchUserDto, SearchUserQueryDto } from './dtos/search-user.dto'

@Controller('users')
@ApiTags('Users')
@Auth(AuthType.Bearer)
export class UserController {
    constructor(
        private readonly studentService: StudentService,
        private readonly lecturerService: LecturerService,
        private readonly adminService: AdminService,
        private readonly userService: UserService,
        private readonly facultyBoardService: FacultyBoardService
    ) {}

    @Get('/role/:role/:id')
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
            case 'faculty_board':
                user = await this.facultyBoardService.getById(id)
                return user ? this.facultyBoardService.toResponseFacultyBoardProfile(user) : null
            default:
                throw new Error('Invalid role')
        }
    }
    @Get('student/:id/saved-theses')
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

    @Post('lecturers/batch')
    async createBatchLecturer(@Body() dtos: CreateBatchLecturerDto[]) {
        return this.lecturerService.createManyLecturer(dtos)
    }

    @Get('/get-all-lecturers')
    @Roles(UserRole.FACULTY_BOARD, UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async getAllLecturers(@Query() query: RequestGetLecturerDto) {
        const res = await this.lecturerService.getAllLecturers(query)
        return plainToInstance(PaginatedTableLecturer, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/get-all-lecturers/combobox')
    @Auth(AuthType.Bearer)
    async getAllLecturers_An(@Query() query: PaginationAn, @Req() req: { user: ActiveUserData }) {
        const res = await this.lecturerService.getAllLecturers_An(req.user.facultyId!, query)
        return plainToInstance(PaginatedMiniLecturer, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
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

    @Post('students/batch')
    async createBatchStudent(@Body() dtos: CreateBatchStudentDto[]) {
        return this.studentService.createManyStudent(dtos)
    }

    @Get('/get-all-students')
    @Roles(UserRole.FACULTY_BOARD, UserRole.ADMIN)
    @UseGuards(RolesGuard)
    async getAllStudents(@Query() query: RequestGetStudentDto) {
        const res = await this.studentService.getAllStudents(query)
        return plainToInstance(PaginatedStudentTable, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Patch('students/profile/:id')
    async updateStudentProfile(@Param('id') id: string, @Body() dto: UpdateStudentProfileDto) {
        const updated = await this.studentService.updateStudentProfile(id, dto)
        return updated ? { message: 'Cập nhật thành công' } : { message: 'Cập nhật thất bại' }
    }

    @Get('/lec/get-all-students/combobox')
    async getAllStudents_An(@Query() query: PaginationAn) {
        const res = await this.studentService.getAllStudents_An(query)
        return plainToInstance(PaginatedMiniStudent, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Delete('students/:id')
    async deleteStudent(@Param('id') id: string) {
        return this.studentService.removeStudentById(id)
    }

    // faculty board endpoint
    @Post('faculty-boards')
    async createFacultyBoard(@Body() dto: CreateFacultyBoardDto) {
        return this.facultyBoardService.createDepartmentTransaction(dto)
    }

    @Post('upload-avatar')
    @UseInterceptors(FileInterceptor('file'))
    @Auth(AuthType.Bearer)
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: { user: ActiveUserData }) {
        const avatarUrl = await this.userService.uploadAvatar(req.user.sub, file)
        return { message: 'File uploaded successfully', avatarUrl }
    }

    @Get('search')
    async search(@Query() query: SearchUserQueryDto): Promise<PaginatedSearchUserDto> {
        return this.userService.searchUsers(query)
    }

    @Get(':id')
    async getUserById(@Param('id') id: string, @Query('role') role: string) {
        if (!role) {
            throw new Error('Role is required in query param')
        }
        return this.getUserByRoleAndId(role, id)
    }
}
