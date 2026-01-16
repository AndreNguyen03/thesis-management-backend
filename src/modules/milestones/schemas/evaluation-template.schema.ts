import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

// Tiêu chí con (VD: "Tính mới và độ phức tạp")
@Schema({ _id: false })
export class SubCriterion {
    @Prop({ required: true })
    id: string // "1.1", "1.2", "2.1", etc.

    @Prop({ required: true })
    name: string // "Tính mới và độ phức tạp"

    @Prop({ type: Number, required: true, min: 0 })
    maxScore: number // 1.5

    @Prop({ required: true })
    elos: string // "LO2"
}

export const SubCriterionSchema = SchemaFactory.createForClass(SubCriterion)

// Tiêu chí chính (VD: "Ý nghĩa khoa học, giá trị thực tiễn")
@Schema({ _id: false })
export class EvaluationCriterion {
    @Prop({ required: true })
    id: string // "1", "2", "3", "4"

    @Prop({ required: true })
    category: string // "Ý nghĩa khoa học, giá trị thực tiễn"

    @Prop({ type: Number, required: true, min: 0 })
    maxScore: number // 3.0

    @Prop({ required: true })
    elos: string // "LO2, LO3"

    @Prop({ type: [SubCriterion], default: [] })
    subcriteria: SubCriterion[]
}

export const EvaluationCriterionSchema = SchemaFactory.createForClass(EvaluationCriterion)

// Template đánh giá - áp dụng cho cả Faculty hoặc Period
@Schema({ timestamps: true, collection: 'evaluation_templates' })
export class EvaluationTemplate extends BaseEntity {
    @Prop({ required: true })
    name: string // "KLTN-7 - Khoa Công nghệ Thông tin"

    @Prop({ required: true })
    facultyId: string // Khoa nào sử dụng

    @Prop({ type: [EvaluationCriterion], required: true })
    criteria: EvaluationCriterion[] // 4 tiêu chí chính

    @Prop({ type: Number, default: 1 })
    version: number // Versioning để track changes

    @Prop({ default: true })
    isActive: boolean // Còn sử dụng không

    @Prop({ default: '' })
    description: string // Mô tả template

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    createdBy: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    lastModifiedBy?: string
}

export const EvaluationTemplateSchema = SchemaFactory.createForClass(EvaluationTemplate)

// Indexes
EvaluationTemplateSchema.index({ facultyId: 1, isActive: 1 })
EvaluationTemplateSchema.index({ name: 1 })
