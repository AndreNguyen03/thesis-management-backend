import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import {
    CreateStudentDto,
    ResponseStudentProfileDto,
    UpdateStudentProfileDto,
    UpdateStudentTableDto
} from '../dtos/student.dto'
import { Student, StudentDocument } from '../schemas/student.schema'
import { StudentRepositoryInterface } from '../repository/student.repository.interface'
import { validateOrReject } from 'class-validator'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { PaginationQueryDto } from '../../common/pagination/dtos/pagination-query.dto'
import { PaginationQueryDto as Pagination_An } from '../../common/pagination-an/dtos/pagination-query.dto'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { CreateUserDto } from '../dtos/create-user.dto'
import { UserRole } from '../enums/user-role'
import { Paginated as Paginated_An } from '../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class StudentService extends BaseServiceAbstract<Student> {
    constructor(
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface,
        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface,

        @InjectConnection()
        private readonly connection: Connection
    ) {
        super(studentRepository)
    }

    toResponseStudentProfile(doc: Student & { userId: any; facultyId: any }): ResponseStudentProfileDto {
        return {
            userId: doc.userId._id.toString(),
            fullName: doc.userId.fullName,
            email: doc.userId.email,
            phone: doc.userId.phone || undefined,
            avatarUrl: doc.userId.avatarUrl || undefined,
            facultyId: doc.facultyId._id.toString(),
            facultyName: doc.facultyId.name,
            role: doc.userId.role,
            isActive: doc.userId.isActive,
            skills: doc.skills || [],
            interests: doc.interests || [],
            studentCode: doc.studentCode,
            class: doc.class,
            major: doc.major
        }
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<void> {
        await this.studentRepository.updatePassword(id, newPasswordHash)
    }

    async findByEmail(email: string): Promise<Student | null> {
        const student = await this.studentRepository.findByEmail(email)
        return student
    }

    async getById(id: string): Promise<Student | null> {
        const student = await this.studentRepository.getById(id)
        return student
    }

    async createStudentTransaction(createStudentDto: CreateStudentDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const existed = await this.userRepository.findByEmail(createStudentDto.email)
            if (existed) throw new BadRequestException('Email đã tồn tại')
            const newUser = plainToInstance(CreateUserDto, createStudentDto)
            const user = await this.userRepository.createUser(newUser, UserRole.STUDENT, { session })
            const student = await this.studentRepository.createStudent(user._id.toString(), createStudentDto, {
                session
            })

            await session.commitTransaction()
            return { user, student }
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    // Lấy tất cả students với phân trang
    async getAllStudents(paginationQuery: PaginationQueryDto) {
        const students = await this.studentRepository.getStudents(paginationQuery)
        return students
    }

    async updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const updated = await this.studentRepository.updateStudentProfile(userId, dto)
            await session.commitTransaction()
            return updated
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    // Update từ admin table
    async updateStudentAdmin(userId: string, dto: UpdateStudentTableDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const updated = await this.studentRepository.updateStudentByTable(userId, dto)
            await session.commitTransaction()
            return updated
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    async removeStudentById(userId: string) {
        // Xóa student
        const studentDelete = await this.studentRepository.removeByUserId(userId)

        // Xóa user
        const userDelete = await this.userRepository.removeById(userId)

        return studentDelete !== undefined && userDelete !== undefined
            ? { success: true, message: 'Xóa sinh viên thành công' }
            : { success: false, message: 'Xóa sinh viên thất bại' }
    }
    async getAllStudents_An(paginationQuery: Pagination_An): Promise<Paginated_An<Student>> {
        const students = await this.studentRepository.getAllStudentsAn(paginationQuery)
        return students
    }
}
