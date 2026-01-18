import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateEvaluationTemplateDto, UpdateEvaluationTemplateDto } from '../dtos'
import { EvaluationTemplate } from '../../milestones/schemas/evaluation-template.schema'

@Injectable()
export class EvaluationTemplateRepository {
    constructor(
        @InjectModel(EvaluationTemplate.name)
        private readonly evaluationTemplateModel: Model<EvaluationTemplate>
    ) {}

    async create(data: CreateEvaluationTemplateDto, userId: string): Promise<EvaluationTemplate> {
        return this.evaluationTemplateModel.create({
            ...data,
            createdBy: userId,
            version: 1
        })
    }

    async findAll(facultyId?: string, isActive?: boolean): Promise<EvaluationTemplate[]> {
        const filter: any = {}
        if (facultyId) filter.facultyId = facultyId
        if (isActive !== undefined) filter.isActive = isActive

        return this.evaluationTemplateModel.find(filter).sort({ createdAt: -1 }).exec()
    }

    async findById(id: string): Promise<EvaluationTemplate | null> {
        return this.evaluationTemplateModel.findById(id).exec()
    }

    async findByName(name: string, facultyId: string): Promise<EvaluationTemplate | null> {
        return this.evaluationTemplateModel.findOne({ name, facultyId, isActive: true }).exec()
    }

    async update(id: string, data: UpdateEvaluationTemplateDto, userId: string): Promise<EvaluationTemplate | null> {
        // Copy-on-write strategy: tạo version mới thay vì ghi đè
        const current = await this.evaluationTemplateModel.findById(id)
        if (!current) return null

        // Nếu có thay đổi criteria, tạo version mới
        if (data.criteria && JSON.stringify(data.criteria) !== JSON.stringify(current.criteria)) {
            return this.evaluationTemplateModel.create({
                ...current.toObject(),
                ...data,
                _id: undefined,
                version: current.version + 1,
                lastModifiedBy: userId,
                createdAt: undefined,
                updatedAt: undefined
            })
        }

        // Chỉ update metadata (name, description, isActive)
        return this.evaluationTemplateModel
            .findByIdAndUpdate(
                id,
                {
                    ...data,
                    lastModifiedBy: userId
                },
                { new: true }
            )
            .exec()
    }

    async softDelete(id: string, userId: string): Promise<EvaluationTemplate | null> {
        return this.evaluationTemplateModel
            .findByIdAndUpdate(
                id,
                {
                    isActive: false,
                    lastModifiedBy: userId
                },
                { new: true }
            )
            .exec()
    }

    async getDefaultForFaculty(facultyId: string): Promise<EvaluationTemplate | null> {
        // Lấy template active mới nhất của faculty
        return this.evaluationTemplateModel
            .findOne({ facultyId, isActive: true })
            .sort({ version: -1, createdAt: -1 })
            .exec()
    }
}
