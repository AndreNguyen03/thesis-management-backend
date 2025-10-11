import { Inject, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { LecturerResponseDto, UpdateLecturerDto } from '../dtos/lecturer.dto'
import { Lecturer, LecturerDocument } from '../schemas/lecturer.schema'
import { LecturerRepositoryInterface } from '../repository/lecturer.repository.interface'
import { validateOrReject } from 'class-validator'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'

@Injectable()
export class LecturerService extends BaseServiceAbstract<Lecturer> {
    constructor(
        @Inject('LecturerRepositoryInterface') private readonly lecturerRepository: LecturerRepositoryInterface
    ) {
        super(lecturerRepository)
    }

    toResponseDto(doc: Lecturer): LecturerResponseDto {
        return plainToInstance(LecturerResponseDto, doc, {
            excludeExtraneousValues: true // chỉ lấy các field có @Expose
        })
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<void> {
        await this.lecturerRepository.updatePassword(id, newPasswordHash)
    }

    async findByEmail(email: string): Promise<Lecturer | null> {
        const lecturer = await this.lecturerRepository.findByEmail(email)
        return lecturer
    }

    async getById(id: string): Promise<Lecturer | null> {
        const lecturer = await this.findOneById(id)
        return lecturer
    }

    // len controller moi map sang dto
    async update(id: string, dto: UpdateLecturerDto): Promise<Lecturer | null> {
        const updateData: Partial<Lecturer> = {}
        Object.keys(dto).forEach((key) => {
            const val = (dto as any)[key]
            if (val !== undefined) updateData[key] = val
        })
        return super.update(id, updateData)
    }
}
