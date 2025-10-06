import { ThesisRepositoryInterface } from '../thesis.repository.interface'
import { Thesis } from '../../schemas/thesis.schemas'
import { NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Student } from '../../../users/schemas/student.schema'
import {
    StudentAlreadyRegisteredException,
    ThesisIsFullRegisteredException
} from '../../../common/exceptions/thesis-exeptions'
import { StudentNotFoundException } from '../../../common/exceptions'
import { ThesisStatus } from '../../enum/thesis-status.enum'
import { GetThesisResponseDto } from '../../dtos'
import { plainToInstance } from 'class-transformer'
export class ThesisRepository extends BaseRepositoryAbstract<Thesis> implements ThesisRepositoryInterface {
    public constructor(
        @InjectModel(Thesis.name)
        private readonly thesisRepository: Model<Thesis>,
        @InjectModel(Student.name)
        private readonly studentRepository: Model<Student>
    ) {
        super(thesisRepository)
    }
    async getAllTheses() {
        const theses = this.thesisRepository
            .find({ deleted_at: null })
            .populate({ path: 'lecturerIds', select: 'fullName' })
            .exec()
        return (await theses).map((thesis) => {
            const { lecturerIds, ...rest } = thesis.toObject()
            return {
                ...rest,
                lecturers: lecturerIds.map((lecturer: any) => lecturer.fullName)
            }
        })
    }
    async studentGetRegisteredThesis(studentId: string) {
        const student = await this.studentRepository.findOne({ _id: studentId, deleted_at: null }).exec()
        if (!student) {
            throw new StudentNotFoundException()
        }
        return this.thesisRepository
            .find({ deleted_at: null, studentIds: studentId })
            .populate({ path: 'lecturerIds', select: 'name' })
            .exec()
    }
    async studentRegisterThesis(studentId: string, thesisId: string) {
        const student = await this.studentRepository.findOne({ _id: studentId, deleted_at: null }).exec()
        const thesis = await this.thesisRepository.findOne({ _id: thesisId, deleted_at: null }).exec()

        //student or thesis not found or deleted
        if (!student) {
            throw new NotFoundException('Student not found or has been deleted')
        }

        if (!thesis) {
            throw new NotFoundException('Thesis not found or has been deleted')
        }

        //check if thesis is full registered
        if (thesis.registeredStudents === thesis.maxStudents) {
            throw new ThesisIsFullRegisteredException()
        }

        if (thesis.studentIds) {
            const studentIds: string[] = Array.isArray(thesis.studentIds)
                ? thesis.studentIds.map((id) => id.toString())
                : [thesis.studentIds]
            //check if student already registered this thesis
            if (studentIds.includes(studentId)) {
                throw new StudentAlreadyRegisteredException()
            }
        }

        const updatedThesis = await this.thesisRepository
            .findByIdAndUpdate(
                thesisId,
                { $addToSet: { studentIds: studentId }, $inc: { registeredStudents: 1 }},
                { new: true }
            )
            .populate({ path: 'lecturerIds', select: 'name' })
            .exec()
        if(updatedThesis&&updatedThesis?.maxStudents === updatedThesis?.registeredStudents){
            updatedThesis.status = ThesisStatus.FULL
            await updatedThesis.save()
        }
        return updatedThesis
    }

   async findSavedByUser(userId: string, role: string): Promise<GetThesisResponseDto[]> {
    const theses = await this.thesisRepository.find({
        savedBy: { $elemMatch: { userId, role } }
    }).lean().exec()
    // Chuyển đổi sang DTO
    return  plainToInstance(GetThesisResponseDto, theses)
}
async saveThesis(userId: string, role: string, thesisId: string) {
    return this.thesisRepository.findByIdAndUpdate(
        thesisId,
        { $addToSet: { savedBy: { userId, role } } },
        { new: true }
    ).exec()
}
}
