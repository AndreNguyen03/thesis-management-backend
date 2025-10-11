import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Registration } from '../../schemas/registration.schema'
import { RegistrationRepositoryInterface } from '../registration.repository.interface'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { RegistrationStatus } from '../../enum'
import { Student } from '../../../users/schemas/student.schema'
import { NotFoundException } from '@nestjs/common'
import { Thesis } from '../../schemas/thesis.schemas'
import {
    StudentAlreadyRegisteredException,
    ThesisIsFullRegisteredException,
    ThesisNotFoundException
} from '../../../common/exceptions/thesis-exeptions'
import { RegistrationNotFoundException } from '../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../dtos/registration/get-registration.dto'
import { plainToClass, plainToInstance } from 'class-transformer'
import { GetThesisResponseDto } from '../../dtos'
import { getUserModelFromRole } from '../../utils/get-user-model'

export class RegistrationRepository
    extends BaseRepositoryAbstract<Registration>
    implements RegistrationRepositoryInterface
{
    constructor(
        @InjectModel(Registration.name)
        private readonly registrationModel: Model<Registration>,
        @InjectModel(Thesis.name)
        private readonly thesisModel: Model<Thesis>
    ) {
        super(registrationModel)
    }
    async getCanceledRegistrationByUser(userId: string, role: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.registrationModel
            .find({
                registrantId: new mongoose.Types.ObjectId(userId),
                registrantModel: getUserModelFromRole(role),
                deleted_at: { $ne: null }
            })
            .populate({
                path: 'thesisId',
                select: 'title description department field maxStudents registeredStudents deadline requirements registrationIds status rating views createdAt updatedAt',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel',
                    populate: {
                        path: 'registrantId',
                        select: 'fullName role'
                    }
                }
            })
            .lean()
        const mappedRegistrations = registrations.map((registration) => {
            const { thesisId, registrantModel, registrantId, ...rest } = registration
            return {
                ...rest,
                thesis: thesisId
            }
        })
        return plainToInstance(GetRegistrationDto, mappedRegistrations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async createRegistration(thesisId: string, userId: string, role: string): Promise<GetThesisResponseDto> {
        const thesis = await this.thesisModel.findOne({ _id: thesisId, deleted_at: null }).exec()
        //thesis not found or deleted
        if (!thesis) {
            throw new ThesisNotFoundException()
        }

        //check if thesis is full registered
        if (thesis.registeredStudents === thesis.maxStudents) {
            throw new ThesisIsFullRegisteredException()
        }

        const existingRegistration = await this.registrationModel.findOne({
            thesisId: thesisId,
            registrantId: userId,
            deleted_at: null
        })
        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }
        if (thesis.maxStudents === thesis.registeredStudents) {
            throw new ThesisIsFullRegisteredException()
        }
        const newRegistration = await this.registrationModel.create({
            thesisId: thesisId,
            registrantId: userId,
            registrantModel: role == UserRole.STUDENT ? 'Student' : 'Lecturer',
            status: RegistrationStatus.APPROVED
        })
        thesis.registeredStudents += 1
        thesis.registrationIds.push(newRegistration._id)
        await thesis.save()

        await thesis.populate({
            path: 'registrationIds',
            select: 'registrantId registrantModel status',
            populate: { path: 'registrantId', select: '_id fullName role' }
        })
        const res = plainToInstance(GetThesisResponseDto, thesis, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return res
    }
    async getThesisRegistrationsByUser(userId: string, role: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.registrationModel
            .find({
                registrantId: new mongoose.Types.ObjectId(userId),
                registrantModel: role == UserRole.STUDENT ? 'Student' : 'Lecturer',
                deleted_at: null
            })
            .populate({
                path: 'thesisId',
                select: 'title description department field maxStudents registeredStudents deadline requirements registrationIds status rating views createdAt updatedAt',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel',
                    populate: {
                        path: 'registrantId',
                        select: 'fullName role'
                    }
                }
            })
            .lean()

        const mappedRegistrations = registrations.map((registration) => {
            const { thesisId, registrantModel, registrantId, ...rest } = registration
            return {
                ...rest,
                thesis: thesisId
            }
        })
        return plainToInstance(GetRegistrationDto, mappedRegistrations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async deleteRegistration(thesisId: string, userId: string, role: string): Promise<Registration> {
        const registration = await this.registrationModel
            .findOne({
                thesisId: new mongoose.Types.ObjectId(thesisId),
                registrantId: userId,
                registrantModel: role === UserRole.STUDENT ? 'Student' : 'Lecturer',
                registrationStatus: RegistrationStatus.CANCELED,
                deleted_at: null
            })
            .exec()

        if (!registration) {
            throw new RegistrationNotFoundException()
        }
        registration.deleted_at = new Date()
        const thesis = await this.thesisModel.findOne({ _id: registration.thesisId, deleted_at: null }).exec()
        if (thesis) {
            thesis.updateOne({ $pull: { registrationIds: registration._id }, $inc: { registeredStudents: -1 } }).exec()

            await thesis.save()
        } else {
            throw new ThesisNotFoundException()
        }

        await registration.save()
        thesis.populate({
            path: 'registrationIds',
            select: 'registrantId registrantModel status',
            populate: { path: 'registrantId', select: '_id fullName role' }
        })

        return registration
    }
}
