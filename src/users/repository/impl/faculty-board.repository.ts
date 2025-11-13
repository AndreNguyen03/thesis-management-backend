import { Inject } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { FacultyBoard } from '../../schemas/department-board.schema'
import { FacultyBoardRepositoryInterface } from '../faculty-board.repository.interface'
import { CreateFacultyBoardDto } from '../../dtos/faculty-board.dto'
import { InjectModel } from '@nestjs/mongoose'

export class FacultyBoardRepository
    extends BaseRepositoryAbstract<FacultyBoard>
    implements FacultyBoardRepositoryInterface
{
    constructor(@InjectModel(FacultyBoard.name) private readonly facultyBoardModel: Model<FacultyBoard>) {
        super(facultyBoardModel)
    }
    async createFacultyBoard(
        userId: string,
        dto: CreateFacultyBoardDto,
        options?: { session?: any }
    ): Promise<FacultyBoard> {
        const facultyBoard = new this.facultyBoardModel({
            userId: new mongoose.Types.ObjectId(userId),
            facultyId: new mongoose.Types.ObjectId(dto.facultyId)
        })
        return facultyBoard.save({ session: options?.session })
    }
}
