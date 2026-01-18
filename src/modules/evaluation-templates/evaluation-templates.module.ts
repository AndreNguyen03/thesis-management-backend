import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { EvaluationTemplate, EvaluationTemplateSchema } from '../milestones/schemas/evaluation-template.schema'
import { EvaluationTemplateController } from './evaluation-template.controller'
import { EvaluationTemplateService } from './evaluation-template.service'
import { EvaluationTemplateRepository } from './repository/evaluation-template.repository'

@Module({
    imports: [
        MongooseModule.forFeature([{ name: EvaluationTemplate.name, schema: EvaluationTemplateSchema }]),
        JwtModule // Import để AccessTokenGuard hoạt động
    ],
    controllers: [EvaluationTemplateController],
    providers: [EvaluationTemplateService, EvaluationTemplateRepository],
    exports: [EvaluationTemplateService, EvaluationTemplateRepository] // Export để DefenseCouncil module dùng
})
export class EvaluationTemplatesModule {}
