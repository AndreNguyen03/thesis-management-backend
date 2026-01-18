import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { EvaluationTemplateRepository } from './repository/evaluation-template.repository'
import { EvaluationTemplate } from '../milestones/schemas/evaluation-template.schema'
import { CreateEvaluationTemplateDto, UpdateEvaluationTemplateDto } from './dtos'

@Injectable()
export class EvaluationTemplateService {
    constructor(private readonly repository: EvaluationTemplateRepository) {}

    async create(dto: CreateEvaluationTemplateDto, userId: string): Promise<EvaluationTemplate> {
        // Validate: tổng maxScore của các criteria phải = 10
        const totalScore = dto.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0)
        if (Math.abs(totalScore - 10) > 0.01) {
            throw new BadRequestException(`Tổng điểm tối đa phải = 10, hiện tại: ${totalScore}`)
        }

        // Validate: subcriteria maxScore phải = criterion maxScore
        for (const criterion of dto.criteria) {
            const subTotal = criterion.subcriteria.reduce((sum, sub) => sum + sub.maxScore, 0)
            if (Math.abs(subTotal - criterion.maxScore) > 0.01) {
                throw new BadRequestException(
                    `Tiêu chí "${criterion.category}": tổng điểm con (${subTotal}) phải = điểm chính (${criterion.maxScore})`
                )
            }
        }

        // Check duplicate name trong faculty
        const existing = await this.repository.findByName(dto.name, dto.facultyId)
        if (existing) {
            throw new ConflictException(`Template "${dto.name}" đã tồn tại trong khoa này`)
        }

        return this.repository.create(dto, userId)
    }

    async findAll(facultyId?: string, isActive?: boolean): Promise<EvaluationTemplate[]> {
        return this.repository.findAll(facultyId, isActive)
    }

    async findById(id: string): Promise<EvaluationTemplate> {
        const template = await this.repository.findById(id)
        if (!template) {
            throw new NotFoundException(`Không tìm thấy template với ID: ${id}`)
        }
        return template
    }

    async update(id: string, dto: UpdateEvaluationTemplateDto, userId: string): Promise<EvaluationTemplate> {
        // Validate nếu có update criteria
        if (dto.criteria) {
            const totalScore = dto.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0)
            if (Math.abs(totalScore - 10) > 0.01) {
                throw new BadRequestException(`Tổng điểm tối đa phải = 10, hiện tại: ${totalScore}`)
            }

            for (const criterion of dto.criteria) {
                const subTotal = criterion.subcriteria.reduce((sum, sub) => sum + sub.maxScore, 0)
                if (Math.abs(subTotal - criterion.maxScore) > 0.01) {
                    throw new BadRequestException(
                        `Tiêu chí "${criterion.category}": tổng điểm con (${subTotal}) phải = điểm chính (${criterion.maxScore})`
                    )
                }
            }
        }

        const updated = await this.repository.update(id, dto, userId)
        if (!updated) {
            throw new NotFoundException(`Không tìm thấy template với ID: ${id}`)
        }
        return updated
    }

    async delete(id: string, userId: string): Promise<EvaluationTemplate> {
        const deleted = await this.repository.softDelete(id, userId)
        if (!deleted) {
            throw new NotFoundException(`Không tìm thấy template với ID: ${id}`)
        }
        return deleted
    }

    async getDefaultForFaculty(facultyId: string): Promise<EvaluationTemplate | null> {
        return this.repository.getDefaultForFaculty(facultyId)
    }

    /**
     * Validate detailedScores từ form submission có khớp với template không
     */
    async validateDetailedScores(
        templateId: string,
        detailedScores: Array<{ criterionId: string; subcriterionId?: string; score: number; maxScore: number }>
    ): Promise<{ isValid: boolean; errors: string[] }> {
        const template = await this.findById(templateId)
        const errors: string[] = []

        // Map template criteria để lookup nhanh
        const criteriaMap = new Map()
        for (const criterion of template.criteria) {
            criteriaMap.set(criterion.id, criterion)
            for (const sub of criterion.subcriteria) {
                criteriaMap.set(`${criterion.id}.${sub.id}`, sub)
            }
        }

        // Validate từng detailedScore
        for (const score of detailedScores) {
            const key = score.subcriterionId ? `${score.criterionId}.${score.subcriterionId}` : score.criterionId
            const templateItem = criteriaMap.get(key)

            if (!templateItem) {
                errors.push(`Không tìm thấy tiêu chí: ${key}`)
                continue
            }

            if (score.score < 0 || score.score > score.maxScore) {
                errors.push(`Điểm ${key} không hợp lệ: ${score.score} (max: ${score.maxScore})`)
            }

            if (Math.abs(score.maxScore - templateItem.maxScore) > 0.01) {
                errors.push(`Điểm tối đa ${key} không khớp: ${score.maxScore} vs ${templateItem.maxScore}`)
            }
        }

        return { isValid: errors.length === 0, errors }
    }
}
