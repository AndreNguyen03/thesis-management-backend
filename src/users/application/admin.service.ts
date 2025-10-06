import { Inject, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { AdminResponseDto, UpdateAdminDto } from '../dtos/admin.dto'
import { Admin, AdminDocument } from '../schemas/admin.schema'
import { AdminRepositoryInterface } from '../repository/admin.repository.interface'
import { validateOrReject } from 'class-validator'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'

@Injectable()
export class AdminService extends BaseServiceAbstract<Admin> {
    constructor(@Inject('AdminRepositoryInterface') private readonly adminRepository: AdminRepositoryInterface) {
        super(adminRepository)
    }

    toResponseDto(doc: Admin): AdminResponseDto {
        return plainToInstance(AdminResponseDto, doc, {
            excludeExtraneousValues: true // chỉ lấy các field có @Expose
        })
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<void> {
        await this.adminRepository.updatePassword(id, newPasswordHash)
    }

    async findByEmail(email: string): Promise<Admin | null> {
        const admin = await this.adminRepository.findByEmail(email)
        return admin
    }

    async getById(id: string): Promise<Admin | null> {
        const admin = await this.findOneById(id)
        return admin
    }

    // len controller moi map sang dto
    async update(id: string, dto: UpdateAdminDto): Promise<Admin | null> {
        const updateData: Partial<Admin> = {}
        Object.keys(dto).forEach((key) => {
            const val = (dto as any)[key]
            if (val !== undefined) updateData[key] = val
        })
        return super.update(id, updateData)
    }
}
