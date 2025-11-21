import { BadRequestException, Inject } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { FacultyBoard } from '../schemas/faculty-board.schema'
import { FacultyBoardRepositoryInterface } from '../repository/faculty-board.repository.interface'
import mongoose, { mongo } from 'mongoose'
import { LecturerRepositoryInterface } from '../repository/lecturer.repository.interface'
import { UserRole } from '../../auth/enum/user-role.enum'
import { StudentRepositoryInterface } from '../repository/student.repository.interface'

export class GetFacultyByUserIdProvider {
    constructor(
        @Inject('FacultyBoardRepositoryInterface')
        private readonly facultyBoardRepository: FacultyBoardRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface
    ) {}

    async getFacultyIdByUserId(userId: string, userRole: UserRole): Promise<string> {
        if (userRole === UserRole.FACULTY_BOARD) {
            const facultyBoard = await this.facultyBoardRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            if (!facultyBoard) {
                throw new BadRequestException('Không tìm thấy thông tin ban khoa cho người dùng này')
            }
            return facultyBoard.facultyId.toString()
        } else if (userRole === UserRole.LECTURER) {
            const lecturer = await this.lecturerRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            if (!lecturer) {
                throw new BadRequestException('Không tìm thấy thông tin giảng viên cho người dùng này')
            }
            return lecturer.facultyId.toString()
        } else {
            const student = await this.studentRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            if (!student) {
                throw new BadRequestException('Không tìm thấy thông tin sinh viên cho người dùng này')
            }
            return student.facultyId.toString()
        }
    }
}
