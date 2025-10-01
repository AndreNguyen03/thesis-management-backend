import { Inject, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { StudentResponseDto, UpdateStudentDto } from '../dtos/student.dto'
import { Student, StudentDocument } from '../schemas/student.schema'
import { StudentRepositoryInterface } from '../repository/student.repository.interface'
import { BaseServiceAbstract } from 'src/shared/base/service/base.service.abstract'
import { validateOrReject } from 'class-validator'

@Injectable()
export class StudentService extends BaseServiceAbstract<Student> {
    constructor(@Inject('StudentRepositoryInterface') private readonly studentRepository: StudentRepositoryInterface) {
        super(studentRepository)
    }

    toResponseDto(doc: Student): StudentResponseDto {
        return plainToInstance(StudentResponseDto, doc, {
            excludeExtraneousValues: true // chỉ lấy các field có @Expose
        })
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<void> {
        await this.studentRepository.updatePassword(id, newPasswordHash)
    }

    async findByEmail(email: string): Promise<Student | null> {
        const student = await this.studentRepository.findByEmail(email)
        return student
    }

    async getById(id: string): Promise<Student | null> {
        const student = await this.findOneById(id)
        return student
    }

    // len controller moi map sang dto
    async update(id: string, dto: UpdateStudentDto): Promise<Student | null> {
        const updateData: Partial<Student> = {}
        Object.keys(dto).forEach((key) => {
            const val = (dto as any)[key]
            if (val !== undefined) updateData[key] = val
        })
        return super.update(id, updateData)
    }
}
