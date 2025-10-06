import { Controller, Get, Param, Patch, Body, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { StudentService } from './application/student.service'
import { LecturerService } from './application/lecturer.service'
import { AdminService } from './application/admin.service'
import { UpdateStudentDto } from './dtos/student.dto'
import { UpdateLecturerDto } from './dtos/lecturer.dto'
import { UpdateAdminDto } from './dtos/admin.dto'

@Controller('users')
@ApiTags('Users')
@Auth(AuthType.Bearer)
export class UserController {
    constructor(
        private readonly studentService: StudentService,
        private readonly lecturerService: LecturerService,
        private readonly adminService: AdminService
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
                user = this.studentService.toResponseDto(user)
                console.log(`Student resposne ::: `, user)
                return user
            case 'lecturer':
                user = await this.lecturerService.getById(id)
                return user ? this.lecturerService.toResponseDto(user) : null
            case 'admin':
                user = await this.adminService.getById(id)
                return user ? this.adminService.toResponseDto(user) : null
            default:
                throw new Error('Invalid role')
        }
    }
    @Get('studnt/:id/saved-theses')
    async getStudentSavedTheses(@Param('id') id: string) {
    }
    @Patch('student/:id')
    async updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
        return this.studentService.update(id, dto)
    }

    @Patch('lecturer/:id')
    async updateLecturer(@Param('id') id: string, @Body() dto: UpdateLecturerDto) {
        return this.lecturerService.update(id, dto)
    }

    @Patch('admin/:id')
    async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
        return this.adminService.update(id, dto)
    }
}
