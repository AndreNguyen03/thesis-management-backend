import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Model, Types } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { StudentRepositoryInterface } from '../student.repository.interface'
import { Student, StudentDocument } from '../../schemas/student.schema'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { CreateStudentDto, UpdateStudentProfileDto, UpdateStudentTableDto } from '../../dtos/student.dto'
import { User } from '../../schemas/users.schema'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'

@Injectable()
export class StudentRepository extends BaseRepositoryAbstract<Student> implements StudentRepositoryInterface {
    constructor(
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(studentModel)
    }
    async getById(id: string) {
        const student = await this.studentModel
            .findOne({ userId: new Types.ObjectId(id) })
            .populate('userId')
            .populate('facultyId')
            .exec()
        return student
    }

    async findByEmail(email: string): Promise<StudentDocument | null> {
        return this.studentModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.studentModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }

    async createStudent(
        userId: string,
        dto: CreateStudentDto,
        options?: { session?: ClientSession }
    ): Promise<Student> {
        const student = new this.studentModel({
            userId: new Types.ObjectId(userId),
            studentCode: dto.studentCode,
            class: dto.class,
            major: dto.major,
            facultyId: new Types.ObjectId(dto.facultyId)
        })
        return student.save({ session: options?.session })
    }

    async updateStudentByTable(id: string, dto: UpdateStudentTableDto) {
        const objectId = new Types.ObjectId(id)
        const student = await this.studentModel.findOne({ userId: objectId })
        if (!student) throw new Error('Student not found')

        // Update user-related fields
        if (dto.fullName || dto.email || dto.isActive !== undefined) {
            await this.userModel.findByIdAndUpdate(objectId, {
                fullName: dto.fullName,
                email: dto.email,
                isActive: dto.isActive,
                phone: dto.phone
            })
        }

        // Update student-related fields
        if (dto.studentCode) student.studentCode = dto.studentCode
        if (dto.class) student.class = dto.class
        if (dto.major) student.major = dto.major
        // if (dto.facultyId) student.facultyId = new mongoose.Schema.Types.ObjectId(dto.facultyId)

        await student.save()
        return { message: 'Updated successfully' }
    }

    async updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
        const objectId = new Types.ObjectId(userId)
        const student = await this.studentModel.findOne({ userId: objectId })
        if (!student) throw new Error('Student not found')

        // Update user fields
        if (dto.fullName || dto.email || dto.isActive !== undefined) {
            await this.userModel.findByIdAndUpdate(objectId, {
                fullName: dto.fullName,
                email: dto.email,
                isActive: dto.isActive,
                phone: dto.phone,
                avatarUrl: dto.avatarUrl
            })
        }

        // Update student fields
        if (dto.skills) student.skills = dto.skills
        if (dto.interests) student.interests = dto.interests

        await student.save()
        return { message: 'Profile updated successfully' }
    }

    async getStudents(query: PaginationQueryDto): Promise<Paginated<Student>> {
        // --- Build sub pipeline riêng ---
        const studentPipeline: any[] = [
            // Join user
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },

            // Join faculty
            { $lookup: { from: 'faculties', localField: 'facultyId', foreignField: '_id', as: 'faculty' } },
            { $unwind: '$faculty' },

            // Project dữ liệu cần thiết
            {
                $project: {
                    id: '$user._id',
                    fullName: '$user.fullName',
                    email: '$user.email',
                    phone: '$user.phone',
                    studentCode: 1,
                    class: 1,
                    major: 1,
                    facultyId: '$faculty._id',
                    facultyName: '$faculty.name',
                    role: '$user.role',
                    isActive: '$user.isActive',
                    createdAt: 1
                }
            }
        ]

        // --- Gọi paginateQuery, truyền pipelineSub ---
        return this.paginationProvider.paginateQuery<Student>(query, this.studentModel, studentPipeline)
    }

    async removeByUserId(userId: string): Promise<{ deletedCount?: number }> {
        const objectId = new Types.ObjectId(userId)
        const result = await this.studentModel.deleteOne({ userId: objectId })
        return { deletedCount: result.deletedCount }
    }
}
