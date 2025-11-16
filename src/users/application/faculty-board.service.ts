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
    async createDepartmentTransaction(createFacultyBoardDto: CreateFacultyBoardDto) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const existed = await this.userRepository.findByEmail(createFacultyBoardDto.email)
            if (existed) throw new BadRequestException('Email đã tồn tại')

            const user = await this.userRepository.createUser(createFacultyBoardDto, UserRole.DEPARTMENT_BOARD, {
                session
            })
            const departmentBoard = await this.facultyBoardRepository.createFacultyBoard(
                user._id.toString(),
                createFacultyBoardDto,
                {
                    session
                }
            )
            await session.commitTransaction()
            return { user, departmentBoard }
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }
    // Implement department board related methods here

    toResponseFacultyBoardProfile(doc: FacultyBoard & { userId: any; facultyId: any }): ResponseFacultyBoardProfileDto {
        return {
            userId: doc.userId._id.toString(),
            fullName: doc.userId.fullName,
            email: doc.userId.email,
            phone: doc.userId.phone,
            avatarUrl: doc.userId.avatarUrl,
            role: doc.userId.role,
            facultyId: doc.facultyId._id.toString(),
            facultyName: doc.facultyId.name,
            isActive: doc.userId.isActive
        }
    }

    async getById(id: string): Promise<FacultyBoard | null> {
        const facultyBoard = await this.facultyBoardRepository.getById(id)
        return facultyBoard
    }
}
