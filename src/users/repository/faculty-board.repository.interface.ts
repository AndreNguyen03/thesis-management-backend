import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateFacultyBoardDto } from '../dtos/faculty-board.dto'
import { UserRole } from '../enums/user-role'
import { FacultyBoard } from '../schemas/department-board.schema'

export interface FacultyBoardRepositoryInterface extends BaseRepositoryInterface<FacultyBoard> {
    createFacultyBoard(userId: string, dto: CreateFacultyBoardDto, options?: { session?: any }): Promise<FacultyBoard>
}
