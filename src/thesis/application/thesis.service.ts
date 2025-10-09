import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ThesisRepositoryInterface } from '../repository/thesis.repository.interface'
import { CreateThesisDto, PatchThesisDto, ReplyRegistrationDto } from '../dtos'
import { ThesisNotFoundException } from '../../common/exceptions/thesis-exeptions'
import { StudentRepositoryInterface } from '../../users/repository/student.repository.interface'
import { LecturerNotFoundException, StudentNotFoundException, WrongRoleException } from '../../common/exceptions'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { RegistrationRepositoryInterface } from '../repository/registration.repository.interface'
import { LecturerRepositoryInterface } from '../../users/repository/lecturer.repository.interface'

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
        private readonly lecturerRepository: LecturerRepositoryInterface
    ) {}
    public async getRegisteredThesis(user: ActiveUserData) {
        await this._validateUser(user.sub, user.role)
        return this.registrationRepository.getThesisRegistrationsByUser(user.sub, user.role)
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

    async getSavedThesesByUser(userId: string, role: string) {
        // return this.thesisRepository.findSavedByUser(userId, role)
    }
    async saveThesis(userId: string, role: string, thesisId: string) {
        // return this.thesisRepository.saveThesis(userId, role, thesisId)
    }

    // async lecturerReplyRegistration(lecturerId: string, replyRegistrationDto: ReplyRegistrationDto) {
    //     const { thesisId, status, message } = replyRegistrationDto
    //     const thesis = await this.thesisRepository.findOneById(thesisId)
    //     if (!thesis) {
    //         throw new ThesisNotFoundException()
    //     }
    // }
    private async _validateUser(userId: string, role: string) {
        if (role === 'student') {
            const user = await this.studentRepository.findOneById(userId)
            if (!user) {
                throw new StudentNotFoundException()
            }
            return user
        } else if (role === 'lecturer') {
            const user = await this.lecturerRepository.findOneById(userId)
            if (!user) {
                throw new LecturerNotFoundException()
            }
            return user
        }
        throw new WrongRoleException('Vai trò không hợp lệ.')
    }
}
