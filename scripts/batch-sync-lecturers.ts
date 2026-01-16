import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { LecturerOntologyService } from '../src/modules/matching/services/lecturer-ontology.service'
import { Lecturer } from '../src/users/schemas/lecturer.schema'
import { Model } from 'mongoose'
import { getModelToken } from '@nestjs/mongoose'

async function bootstrap() {
    console.log('Starting batch sync for all lecturers...')

    const app = await NestFactory.createApplicationContext(AppModule)

    const lecturerOntologyService = app.get(LecturerOntologyService)
    const lecturerModel = app.get<Model<Lecturer>>(getModelToken(Lecturer.name))

    try {
        // Get all lecturers
        const lecturers = await lecturerModel.find().lean()
        console.log(`Found ${lecturers.length} lecturers to process`)

        let success = 0
        let failed = 0

        // Process lecturers one by one with rate limiting
        for (let i = 0; i < lecturers.length; i++) {
            const lecturer = lecturers[i]

            try {
                console.log(`\n[${i + 1}/${lecturers.length}] Processing lecturer: ${lecturer._id}`)

                await lecturerOntologyService.syncLecturerOntology(lecturer._id.toString())

                success++
                console.log(`✓ Success`)

                // Rate limiting: wait 100ms between requests
                await new Promise((resolve) => setTimeout(resolve, 100))
            } catch (error) {
                failed++
                console.error(`✗ Failed: ${error.message}`)
            }
        }

        console.log('\n=== Batch Sync Completed ===')
        console.log(`Total: ${lecturers.length}`)
        console.log(`Success: ${success}`)
        console.log(`Failed: ${failed}`)
    } catch (error) {
        console.error('Batch sync failed:', error)
    } finally {
        await app.close()
    }
}

bootstrap()
