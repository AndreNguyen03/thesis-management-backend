import { Injectable } from '@nestjs/common'
import { StudentService } from './student.service'
import { LecturerService } from './lecturer.service'
import { AdminService } from './admin.service'
import { Admin } from '../schemas/admin.schema'
import { Student } from '../schemas/student.schema'
import { Lecturer } from '../schemas/lecturer.schema'
import { AdminResponseDto } from '../dtos/admin.dto'
import { StudentResponseDto } from '../dtos/student.dto'
import { LecturerResponseDto } from '../dtos/lecturer.dto'

@Injectable()
export class UserService {
    constructor(
        private readonly studentService: StudentService,
        private readonly lecturerService: LecturerService,
        private readonly adminService: AdminService
    ) {}

    toResponseDto(user: Admin | Student | Lecturer): AdminResponseDto | StudentResponseDto | LecturerResponseDto {
        switch (user.role) {
            case 'admin':
                return this.adminService.toResponseDto(user)
            case 'student':
                return this.studentService.toResponseDto(user)
            case 'lecturer':
                return this.lecturerService.toResponseDto(user)
        }
    }

    async findById(id: string) {
        const admin = await this.adminService.getById(id)
        if (admin) return admin

        const lecturer = await this.lecturerService.getById(id)
        if (lecturer) return lecturer

        const student = await this.studentService.getById(id)
        if (student) return student

        return null
    }

    async findByEmail(email: string) {
        const admin = await this.adminService.findByEmail(email)
        if (admin) return admin

        const lecturer = await this.lecturerService.findByEmail(email)
        if (lecturer) return lecturer

        const student = await this.studentService.findByEmail(email)
        if (student) return student

        return null
    }

    async updatePassword(id: string, newPasswordHash: string) {
        const admin = await this.adminService.getById(id)
        if (admin) return this.adminService.updatePassword(id, newPasswordHash)

        const lecturer = await this.lecturerService.getById(id)
        if (lecturer) return this.lecturerService.updatePassword(id, newPasswordHash)

        const student = await this.studentService.getById(id)
        if (student) return this.studentService.updatePassword(id, newPasswordHash)

        return null
    }
}
