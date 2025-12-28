import { writeFileSync } from 'fs'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '../app.module'

async function generateSwaggerDoc() {
    const app = await NestFactory.create(AppModule, { logger: false })

    const config = new DocumentBuilder().setTitle('Thesis Management System API').setVersion('1.0.0').build()

    const document = SwaggerModule.createDocument(app, config)
    writeFileSync('./swagger.json', JSON.stringify(document, null, 2))

    console.log('✅ Swagger documentation exported to swagger.json')
    await app.close()
}

generateSwaggerDoc()
