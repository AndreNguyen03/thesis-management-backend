import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { CreateThesisDto, GetThesisResponseDto, PatchThesisDto, ReplyRegistrationDto } from '../dtos'
import { StudentRepositoryInterface } from '../../users/repository/student.repository.interface'
import { LecturerNotFoundException, StudentNotFoundException, WrongRoleException } from '../../common/exceptions'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { LecturerRepositoryInterface } from '../../users/repository/lecturer.repository.interface'
import { UserRole } from '../../auth/enum/user-role.enum'
import { ArchiveRepositoryInterface, RegistrationRepositoryInterface, ThesisRepositoryInterface } from '../repository'

@Injectable()
export class ThesisService {
    constructor(
        @Inject('ThesisRepositoryInterface')
        private readonly thesisRepository: ThesisRepositoryInterface,
        @Inject('StudentRepositoryInterface')
        private readonly studentRepository: StudentRepositoryInterface,
        @Inject('RegistrationRepositoryInterface')
        private readonly registrationRepository: RegistrationRepositoryInterface,
        @Inject('LecturerRepositoryInterface')
        private readonly lecturerRepository: LecturerRepositoryInterface,
        @Inject('ArchiveRepositoryInterface')
        private readonly archiveRepository: ArchiveRepositoryInterface
    ) {}
    public async getRegisteredThesis(user: ActiveUserData) {
        await this._validateUser(user.sub, user.role)
        return this.registrationRepository.getThesisRegistrationsByUser(user.sub, user.role)
    }
    public async getAllTheses(userId: string, role: string) {
        return this.thesisRepository.getAllTheses(userId, role)
    }
    public async createThesis(thesisData: CreateThesisDto) {
        return this.thesisRepository.create(thesisData)
    }
    public async updateThesis(id: string, thesisData: PatchThesisDto) {
        return this.thesisRepository.update(id, thesisData)
    }
    public async deleteThesis(id: string) {
        // const thesis = await this.thesisRepository.findOneById(id)
        // if (!thesis) {
        //     throw new NotFoundException('Thesis not found')
        // }
        // if (thesis.deleted_at) {
        //     throw new Error('Thesis already deleted')
        // }
        // return this.thesisRepository.permanentlyDelete(id)
    }
    public async registerForThesis(userId: string, thesisId: string, role: string) {
        await this._validateUser(userId, role)

        return this.registrationRepository.createRegistration(thesisId, userId, role)
    }

    public async cancelRegistration(userId: string, thesisId: string, role: string) {
        await this._validateUser(userId, role)
        return this.registrationRepository.deleteRegistration(thesisId, userId, role)
    }

    public async getSavedTheses(userId: string, role: string): Promise<GetThesisResponseDto[]> {
        await this._validateUser(userId, role)

        return await this.archiveRepository.findSavedThesesByUserId(userId, role)
    }
    public async saveThesis(userId: string, role: string, thesisId: string) {
        await this._validateUser(userId, role)
        return await this.archiveRepository.archiveThesis(userId, role, thesisId)
    }

    public async unarchiveThesis(userId: string, thesisId: string, role: string) {
        await this._validateUser(userId, role)
        return await this.archiveRepository.unarchiveThesis(userId, thesisId, role)
    }

    async getCanceledRegistrations(userId:string, role:string) {
        await this._validateUser(userId, role)
        return this.registrationRepository.getCanceledRegistrationByUser(userId, role)
    }

    private async _validateUser(userId: string, role: string) {
        if (role === UserRole.STUDENT) {
            const user = await this.studentRepository.findOneById(userId)
            if (!user) {
                throw new StudentNotFoundException()
            }
            return user
        } else if (role === UserRole.LECTURER) {
            const user = await this.lecturerRepository.findOneById(userId)
            if (!user) {
                throw new LecturerNotFoundException()
            }
            return user
        }
        throw new WrongRoleException('Vai trò không hợp lệ.')
    }
}
