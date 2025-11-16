import { ClientSession } from 'mongoose'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateFacultyBoardDto, UpdateFacultyBoardProfileDto, UpdateFacultyBoardTableDto } from '../dtos/faculty-board.dto'
import { UserRole } from '../enums/user-role'
import { FacultyBoard, FacultyBoardDocument } from '../schemas/faculty-board.schema'

export interface FacultyBoardRepositoryInterface extends BaseRepositoryInterface<FacultyBoard> {
    createFacultyBoard(userId: string, dto: CreateFacultyBoardDto, options?: { session?: any }): Promise<FacultyBoard>
    findByEmail(email: string): Promise<FacultyBoardDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>
    createFacultyBoard(userId: string, dto: CreateFacultyBoardDto, options?: { session?: ClientSession }): Promise<FacultyBoard>
    updateFacultyBoardByTable(id: string, dto: UpdateFacultyBoardTableDto): Promise<any>
    updateFacultyBoardProfile(userId: string, dto: UpdateFacultyBoardProfileDto): Promise<any>

    removeByUserId(userId: string): Promise<{ deletedCount?: number }>
    getById(id: string)
}
