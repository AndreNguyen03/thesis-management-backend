import { Inject, Injectable } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { User } from '../schemas/users.schema'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import mongoose, { mongo } from 'mongoose'
import { FacultyBoardService } from '../application/faculty-board.service'
import { LecturerService } from '../application/lecturer.service'
import { UserRole } from '../enums/user-role'
import { LecturerRepositoryInterface } from '../repository/lecturer.repository.interface'
import { FacultyBoardRepositoryInterface } from '../repository/faculty-board.repository.interface'

@Injectable()
export class CheckUserInfoProvider {
    constructor(
        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('FacultyBoardRepositoryInterface')
        private readonly facultyBoardRepository: FacultyBoardRepositoryInterface
    ) {}
    async getUserInfo(userId: string) {
        const existingUser = await this.userRepository.findOneByCondition({
            _id: new mongoose.Types.ObjectId(userId),
            isActive: true,
            deleted_at: null
        })
        if(!existingUser){
            throw new Error('User not found')
        }
        return existingUser
    }
    async getFacultyBoardIdByUserId(userId: string, role: string): Promise<string | null> {
        if ((role = UserRole.LECTURER)) {
            const lec = await this.lecturerRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            return lec ? lec._id.toString() : null
        } else if ((role = UserRole.STUDENT)) {
            const stu = await this.lecturerRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            return stu ? stu._id.toString() : null
        } else if ((role = UserRole.FACULTY_BOARD)) {
            const facu = await this.facultyBoardRepository.findOneByCondition({
                userId: new mongoose.Types.ObjectId(userId),
                deleted_at: null
            })
            return facu ? facu._id.toString() : null
        } else return null
    }
    async getUsersByIds(userIds: string[]): Promise<User[] | null> {
        const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id))
        const users = await this.userRepository.findByCondition({
            _id: { $in: objectIds.map((id) => new mongoose.Types.ObjectId(id)) },
            deleted_at: null
        })
        return users
    }
}
