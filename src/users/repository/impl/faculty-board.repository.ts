import { Inject } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { FacultyBoard, FacultyBoardDocument } from '../../schemas/faculty-board.schema'
import { FacultyBoardRepositoryInterface } from '../faculty-board.repository.interface'
import {
    CreateFacultyBoardDto,
    UpdateFacultyBoardProfileDto,
    UpdateFacultyBoardTableDto
} from '../../dtos/faculty-board.dto'
import { InjectModel } from '@nestjs/mongoose'
import { Types } from 'mongoose'

export class FacultyBoardRepository
    extends BaseRepositoryAbstract<FacultyBoard>
    implements FacultyBoardRepositoryInterface
{
    constructor(@InjectModel(FacultyBoard.name) private readonly facultyBoardModel: Model<FacultyBoard>) {
        super(facultyBoardModel)
    }

    findByEmail(email: string): Promise<FacultyBoardDocument | null> {
        throw new Error('Method not implemented.')
    }

    updatePassword(id: string, newHash: string): Promise<void> {
        throw new Error('Method not implemented.')
    }

    updateFacultyBoardByTable(id: string, dto: UpdateFacultyBoardTableDto): Promise<any> {
        throw new Error('Method not implemented.')
    }

    updateFacultyBoardProfile(userId: string, dto: UpdateFacultyBoardProfileDto): Promise<any> {
        throw new Error('Method not implemented.')
    }

    removeByUserId(userId: string): Promise<{ deletedCount?: number }> {
        throw new Error('Method not implemented.')
    }

    async getById(id: string) {
        const facultyBoard = await this.facultyBoardModel
            .findOne({ userId: new Types.ObjectId(id) })
            .populate('userId')
            .populate('facultyId')
            .exec()
        return facultyBoard
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
