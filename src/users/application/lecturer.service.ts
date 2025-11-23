import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { Lecturer, LecturerDocument } from '../schemas/lecturer.schema'
import { LecturerRepositoryInterface } from '../repository/lecturer.repository.interface'
import { validateOrReject } from 'class-validator'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { PaginationQueryDto } from '../../common/pagination/dtos/pagination-query.dto'
import { PaginationQueryDto as PaginationAn } from '../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../common/pagination/interface/paginated.interface'
import {
    CreateLecturerDto,
    ResponseLecturerProfileDto,
    UpdateLecturerProfileDto,
    UpdateLecturerTableDto
} from '../dtos/lecturer.dto'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection, HydratedDocument } from 'mongoose'
import { UserRole } from '../enums/user-role'

@Injectable()
export class LecturerService extends BaseServiceAbstract<Lecturer> {
    constructor(
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,

        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface,

        @InjectConnection()
        private readonly connection: Connection
    ) {
        super(lecturerRepository)
    }

    toResponseLecturerProfile(doc: Lecturer & { userId: any; facultyId: any }): ResponseLecturerProfileDto {
        return {
            userId: doc.userId._id.toString(),
            fullName: doc.userId.fullName,
            email: doc.userId.email,
            phone: doc.userId.phone,
            avatarUrl: doc.userId.avatarUrl,
            title: doc.title,
            role: doc.userId.role,
            facultyId: doc.facultyId._id.toString(),
            facultyName: doc.facultyId.name,
            isActive: doc.userId.isActive,
            areaInterest: doc.areaInterest,
            researchInterests: doc.researchInterests,
            publications: doc.publications,
            supervisedThesisIds: doc.supervisedThesisIds.map((id) => id.toString())
        }
    }
    async updatePassword(id: string, newPasswordHash: string): Promise<void> {
        await this.lecturerRepository.updatePassword(id, newPasswordHash)
    }

    async findByEmail(email: string): Promise<Lecturer | null> {
        const lecturer = await this.lecturerRepository.findByEmail(email)
        return lecturer
    }

    async getById(id: string): Promise<Lecturer | null> {
        const lecturer = await this.lecturerRepository.getById(id)
        return lecturer
    }

    async createLecturerTransaction(createLecturerDto: CreateLecturerDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const existed = await this.userRepository.findByEmail(createLecturerDto.email)
            if (existed) throw new BadRequestException('Email đã tồn tại')

            const user = await this.userRepository.createUser(createLecturerDto, UserRole.LECTURER, { session })
            const lecturer = await this.lecturerRepository.createLecturer(user._id.toString(), createLecturerDto, {
                session
            })

            await session.commitTransaction()
            return { user, lecturer }
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    // get all lecturers with pagination
    async getAllLecturers(paginationQuery: PaginationQueryDto) {
        const lecturers = await this.lecturerRepository.getLecturers(paginationQuery)
        return lecturers
    }

    async getAllLecturers_An(paginationQuery: PaginationAn) {
        const lecturers = await this.lecturerRepository.getAllLecturersAn(paginationQuery)
        return lecturers
    }
    async updateLecturerProfile(userId: string, dto: UpdateLecturerProfileDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const updated = await this.lecturerRepository.updateLecturerProfile(userId, dto)
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
    async updateLecturerAdmin(userId: string, dto: UpdateLecturerTableDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const updated = await this.lecturerRepository.updateLecturerByTable(userId, dto)
            await session.commitTransaction()
            return updated
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    async removeLecturerById(userId: string) {
        // Xóa lecturer
        const lecturerDelete = await this.lecturerRepository.removeByUserId(userId)

        // Xóa user
        const userDelete = await this.userRepository.removeById(userId)

        return lecturerDelete !== undefined && userDelete !== undefined
            ? { success: true, message: 'Xóa giảng viên thành công' }
            : { success: false, message: 'Xóa giảng viên thất bại' }
    }
}
