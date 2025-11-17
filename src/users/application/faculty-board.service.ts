import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { Paginated } from '../../common/pagination/interface/paginated.interface'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import { UserRole } from '../enums/user-role'
import { FacultyBoard } from '../schemas/faculty-board.schema'
import { FacultyBoardRepositoryInterface } from '../repository/faculty-board.repository.interface'
import { CreateFacultyBoardDto, ResponseFacultyBoardProfileDto } from '../dtos/faculty-board.dto'
import { plainToInstance } from 'class-transformer'
import { Lecturer } from '../schemas/lecturer.schema'
import { ResponseLecturerProfileDto } from '../dtos/lecturer.dto'

@Injectable()
export class FacultyBoardService extends BaseServiceAbstract<FacultyBoard> {
    constructor(
        @Inject('FacultyBoardRepositoryInterface')
        private readonly facultyBoardRepository: FacultyBoardRepositoryInterface,
        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface,
        @InjectConnection()
        private readonly connection: Connection
    ) {
        super(facultyBoardRepository)
    }

    toResponseFacultyBoardProfile(doc: FacultyBoard & { userId: any; facultyId: any, createdAt: Date, updatedAt: Date }): ResponseFacultyBoardProfileDto {
        return {
            userId: doc.userId._id.toString(),
            fullName: doc.userId.fullName,
            email: doc.userId.email,
            phone: doc.userId.phone,
            avatarUrl: doc.userId.avatarUrl,
            role: doc.userId.role,
            facultyId: doc.facultyId._id.toString(),
            facultyName: doc.facultyId.name,
            isActive: doc.userId.isActive,
            createdAt: doc.userId.createdAt,
            updatedAt: doc.userId.updatedAt
        }
    }

    async createDepartmentTransaction(createFacultyBoardDto: CreateFacultyBoardDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const existed = await this.userRepository.findByEmail(createFacultyBoardDto.email)
            if (existed) throw new BadRequestException('Email đã tồn tại')

            const user = await this.userRepository.createUser(createFacultyBoardDto, UserRole.FACULTY_BOARD, {
                session
            })
            const facultyBoard = await this.facultyBoardRepository.createFacultyBoard(
                user._id.toString(),
                createFacultyBoardDto,
                {
                    session
                }
            )
            await session.commitTransaction()
            return { user, facultyBoard }
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }
    async getById(id: string) {
        const facultyBoard = await this.facultyBoardRepository.getById(id)
        return facultyBoard
    }
    // Implement department board related methods here
}
