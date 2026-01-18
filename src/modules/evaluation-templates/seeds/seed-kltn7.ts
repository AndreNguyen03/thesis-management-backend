import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../../app.module'
import { EvaluationTemplateService } from '../evaluation-template.service'
import { KLTN7_EVALUATION_TEMPLATE } from './kltn7-evaluation-template.seed'

/**
 * Script seed KLTN-7 template vào database
 * Chạy: npm run seed:evaluation-template
 */
async function bootstrap() {
    console.log('🌱 Starting seed evaluation template...')

    const app = await NestFactory.createApplicationContext(AppModule)
    const service = app.get(EvaluationTemplateService)

    try {
        // TODO: Lấy facultyId và userId thực tế từ DB
        const facultyId = '507f1f77bcf86cd799439011' // Placeholder - cần thay bằng ID thực
        const createdBy = '507f1f77bcf86cd799439012' // Placeholder - cần thay bằng ID admin

        console.log('📝 Checking existing template...')
        const existingTemplates = await service.findAll(facultyId, true)
        const exists = existingTemplates.find((t) => t.name === KLTN7_EVALUATION_TEMPLATE.name)

        if (exists) {
            console.log('✅ KLTN-7 template already exists:', exists._id)
            console.log('   Version:', exists.version)
        } else {
            console.log('🔨 Creating KLTN-7 template...')
            const template = await service.create(
                {
                    ...KLTN7_EVALUATION_TEMPLATE,
                    facultyId
                } as any,
                createdBy
            )
            console.log('✅ Created KLTN-7 template successfully!')
            console.log('   ID:', template._id)
            console.log('   Name:', template.name)
            console.log('   Criteria count:', template.criteria.length)
        }
    } catch (error) {
        console.error('❌ Error seeding template:', error.message)
        process.exit(1)
    } finally {
        await app.close()
        console.log('👋 Seed completed')
    }
}

bootstrap()
