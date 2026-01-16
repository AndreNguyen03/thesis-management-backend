import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { GetEmbeddingProvider } from '../modules/chatbot/providers/get-embedding.provider'
import { EnhancedEmbeddingProvider } from '../modules/chatbot/providers/enhanced-embedding.provider'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Lecturer } from '../users/schemas/lecturer.schema'
import { User } from '../users/schemas/users.schema'
import { KnowledgeSource } from '../modules/knowledge-source/schemas/knowledge-source.schema'
import { KnowledgeChunk } from '../modules/knowledge-source/schemas/knowledge-chunk.schema'
import { SourceType } from '../modules/knowledge-source/enums/source_type.enum'
import { buildProfileText } from '../modules/knowledge-source/utils/build-lecturer-profile.utils'

/**
 * Script để index lecturer profiles vào knowledge base
 *
 * Usage:
 *   npx ts-node src/scripts/index-lecturers.ts
 */

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)

    const lecturerModel = app.get<Model<Lecturer>>('LecturerModel')
    const userModel = app.get<Model<User>>('UserModel')
    const knowledgeSourceModel = app.get<Model<KnowledgeSource>>('KnowledgeSourceModel')
    const knowledgeChunkModel = app.get<Model<KnowledgeChunk>>('KnowledgeChunkModel')
    const embeddingProvider = app.get(EnhancedEmbeddingProvider)

    console.log('🚀 Starting ENHANCED lecturer indexing with new profile format...\n')

    try {
        // Xóa data cũ (nếu có)
        const deleteResult = await knowledgeSourceModel.deleteMany({
            source_type: SourceType.LECTURER_PROFILE
        })
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} old lecturer knowledge sources\n`)

        // Lấy tất cả lecturers
        const lecturers = await lecturerModel
            .find()
            .populate('userId', 'fullName email bio')
            .populate('facultyId', 'name')
            .lean()

        console.log(`📋 Found ${lecturers.length} lecturers to index\n`)

        let successCount = 0
        let errorCount = 0

        for (const lecturer of lecturers) {
            try {
                const user = lecturer.userId as any
                const faculty = lecturer.facultyId as any

                if (!user || !user.fullName) {
                    console.log(`⚠️  Skipping lecturer ${lecturer._id} - no user data`)
                    continue
                }

                // Tạo profile text (ghép tất cả thông tin quan trọng)
                const profileText = buildProfileText(lecturer, user, faculty)

                console.log(`\n👤 Processing: ${user.fullName}`)
                console.log(`   📝 Profile length: ${profileText.length} chars`)

                // Tạo embedding với EnhancedEmbeddingProvider
                const embedding = await embeddingProvider.embedLecturerProfile({
                    fullName: user.fullName,
                    title: lecturer.title,
                    bio: user.bio,
                    researchInterests: lecturer.researchInterests,
                    areaInterest: lecturer.areaInterest,
                    publications: lecturer.publications
                })
                console.log(`   ✅ Generated ENHANCED embedding (${embedding.length} dimensions)`)

                // Tạo knowledge source
                const knowledgeSource = await knowledgeSourceModel.create({
                    source_type: SourceType.LECTURER_PROFILE,
                    source_location: lecturer._id.toString(),
                    source_name: user.fullName,
                    source_url: null,
                    status: 'completed',
                    metadata: {
                        title: lecturer.title,
                        faculty: faculty?.name || 'N/A',
                        email: user.email
                    }
                })
                console.log(`   📦 Created knowledge source: ${knowledgeSource._id}`)

                // Tạo knowledge chunk
                const chunk = await knowledgeChunkModel.create({
                    source_id: knowledgeSource._id,
                    text: profileText,
                    embedding: embedding,
                    metadata: {
                        lecturerId: lecturer._id.toString(),
                        userId: user._id.toString(),
                        title: lecturer.title,
                        faculty: faculty?.name || 'N/A',
                        researchInterests: lecturer.researchInterests || [],
                        publicationCount: lecturer.publications?.length || 0
                    }
                })
                console.log(`   ✅ Created knowledge chunk: ${chunk._id}`)

                successCount++
            } catch (error) {
                console.error(`   ❌ Error processing lecturer ${lecturer._id}:`, error.message)
                errorCount++
            }
        }

        console.log('\n' + '='.repeat(60))
        console.log('📊 ENHANCED INDEXING SUMMARY')
        console.log('='.repeat(60))
        console.log(`✅ Successfully indexed: ${successCount} lecturers`)
        console.log(`❌ Failed: ${errorCount} lecturers`)
        console.log(`📦 Total: ${lecturers.length} lecturers`)
        console.log('='.repeat(60))
        console.log('\n🎯 NEW FEATURES:')
        console.log('  ✅ Structured fields with [NAME], [EXPERTISE] markers')
        console.log('  ✅ Technical abbreviation expansion (AI → AI artificial intelligence...)')
        console.log('  ✅ 3x repetition for name and expertise')
        console.log('  ✅ Field boosting for better semantic matching')
        console.log('='.repeat(60))

        // Verify data
        const totalChunks = await knowledgeChunkModel.countDocuments({
            'metadata.lecturerId': { $exists: true }
        })
        console.log(`\n🔍 Verification: Found ${totalChunks} lecturer chunks in database`)
    } catch (error) {
        console.error('❌ Fatal error:', error)
    } finally {
        await app.close()
        console.log('\n✅ Enhanced indexing script completed')
        console.log('🔄 Please restart the backend to use new embeddings')
    }
}

// Run script
bootstrap()
