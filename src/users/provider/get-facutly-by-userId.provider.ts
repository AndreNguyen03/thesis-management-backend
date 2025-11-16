import { BadRequestException, Inject } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { FacultyBoard } from '../schemas/department-board.schema'
import { FacultyBoardRepositoryInterface } from '../repository/faculty-board.repository.interface'
import mongoose, { mongo } from 'mongoose'

export class GetFacultyByUserIdProvider extends BaseServiceAbstract<FacultyBoard> {
    constructor(
        @Inject('FacultyBoardRepositoryInterface')
        private readonly facultyBoardRepository: FacultyBoardRepositoryInterface
    ) {
        super(facultyBoardRepository)
    }

    async getFacultyByUserId(userId: string): Promise<string> {
        const facultyBoard = await this.findOneByCondition({
            userId: new mongoose.Types.ObjectId(userId),
            deleted_at: null
        })
        if (!facultyBoard) {
            throw new BadRequestException('Không tìm thấy thông tin ban khoa cho người dùng này')
        }
        return facultyBoard.facultyId.toString()
    }
}
