import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { StudentOntologyService } from '../src/modules/matching/services/student-ontology.service'
import { Student } from '../src/users/schemas/student.schema'
import { Model } from 'mongoose'
import { getModelToken } from '@nestjs/mongoose'

async function bootstrap() {
    console.log('Starting batch compute for all students...')

    const app = await NestFactory.createApplicationContext(AppModule)

    const studentOntologyService = app.get(StudentOntologyService)
    const studentModel = app.get<Model<Student>>(getModelToken(Student.name))

    try {
        // Get all students
        const students = await studentModel.find().lean()
        console.log(`Found ${students.length} students to process`)

        let success = 0
        let failed = 0
        let skipped = 0

        // Process students one by one with rate limiting
        for (let i = 0; i < students.length; i++) {
            const student = students[i]

            try {
                console.log(`\n[${i + 1}/${students.length}] Processing student: ${student._id}`)

                // Check if student has skills or interests
                const hasData =
                    (student.interests && student.interests.length > 0) || (student.skills && student.skills.length > 0)

                if (!hasData) {
                    console.log(`⊘ Skipped: No interests or skills`)
                    skipped++
                    continue
                }

                await studentOntologyService.computeStudentOntology(student._id.toString())

                success++
                console.log(`✓ Success`)

                // Rate limiting: wait 100ms between requests
                await new Promise((resolve) => setTimeout(resolve, 100))
            } catch (error) {
                failed++
                console.error(`✗ Failed: ${error.message}`)
            }
        }

        console.log('\n=== Batch Compute Completed ===')
        console.log(`Total: ${students.length}`)
        console.log(`Success: ${success}`)
        console.log(`Failed: ${failed}`)
        console.log(`Skipped: ${skipped}`)
    } catch (error) {
        console.error('Batch compute failed:', error)
    } finally {
        await app.close()
    }
}

bootstrap()
