import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ThesisRepositoryInterface } from '../repository/thesis.repository.interface'
import { CreateThesisDto, PatchThesisDto } from '../dtos'

@Injectable()
export class ThesisService {
    constructor(
        @Inject('ThesisRepositoryInterface')
        private readonly thesisRepository: ThesisRepositoryInterface
    ) {}
    public async studentGetRegisteredThesis(studentId: string) {
        return this.thesisRepository.studentGetRegisteredThesis(studentId)
    }
    public async getAllTheses() {
        return this.thesisRepository.getAllTheses()
    }
    public async createThesis(thesisData: CreateThesisDto) {
        return this.thesisRepository.create(thesisData)
    }
    public async updateThesis(id: string, thesisData: PatchThesisDto) {
        return this.thesisRepository.update(id, thesisData)
    }
    public async deleteThesis(id: string) {
        const thesis = await this.thesisRepository.findOneById(id)
        if (!thesis) {
            throw new NotFoundException('Thesis not found')
        }
        if (thesis.deleted_at) {
            throw new Error('Thesis already deleted')
        }
        return this.thesisRepository.softDelete(id)
    }
    public async studentRegisterThesis(studentId: string, thesisId: string) {
        return this.thesisRepository.studentRegisterThesis(studentId, thesisId)
    }

     async getSavedThesesByUser(userId: string, role: string) {
        return this.thesisRepository.findSavedByUser(userId, role)
    }
    async saveThesis(userId: string, role: string, thesisId: string) {
    return this.thesisRepository.saveThesis(userId, role, thesisId)
}
}
