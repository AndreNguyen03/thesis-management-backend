import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { GetEmbeddingProvider } from '../modules/chatbot/providers/get-embedding.provider'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Lecturer } from '../users/schemas/lecturer.schema'
import { User } from '../users/schemas/users.schema'
import { KnowledgeSource } from '../modules/knowledge-source/schemas/knowledge-source.schema'
import { KnowledgeChunk } from '../modules/knowledge-source/schemas/knowledge-chunk.schema'
import { SourceType } from '../modules/knowledge-source/enums/source_type.enum'
import { string } from 'joi'

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
    const embeddingProvider = app.get(GetEmbeddingProvider)

    console.log('🚀 Starting lecturer indexing...\n')

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

                // Tạo embedding
                const embedding = await embeddingProvider.getEmbedding(profileText)
                console.log(`   ✅ Generated embedding (${embedding.length} dimensions)`)

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
        console.log('📊 INDEXING SUMMARY')
        console.log('='.repeat(60))
        console.log(`✅ Successfully indexed: ${successCount} lecturers`)
        console.log(`❌ Failed: ${errorCount} lecturers`)
        console.log(`📦 Total: ${lecturers.length} lecturers`)
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
        console.log('\n✅ Script completed')
    }
}

/**
 * Build comprehensive profile text for embedding
 * Cấu trúc text để tối ưu cho semantic search
 */
function buildProfileText(lecturer: any, user: any, faculty: any): string {
    const sections: string[] = []

    // 1. Basic info (lặp lại để tăng trọng số)
    sections.push(`Giảng viên: ${user.fullName}`)
    sections.push(`Tên: ${user.fullName}`)
    sections.push(`Email: ${user.email}`)
    sections.push(`Học hàm: ${lecturer.title}`)

    // 2. Faculty
    if (faculty?.name) {
        sections.push(`Khoa: ${faculty.name}`)
    }

    // 3. Bio (nếu có)
    if (user.bio) {
        sections.push(`\nTiểu sử:\n${user.bio}`)
    }

    // 4. Research interests (LẶP 2 LẦN để tăng độ ưu tiên)
    if (lecturer.researchInterests && lecturer.researchInterests.length > 0) {
        const interests = lecturer.researchInterests.join(', ')
        sections.push(`\nLĩnh vực nghiên cứu: ${interests}`)
        sections.push(`Chuyên môn: ${interests}`) // Lặp lại với từ khóa khác
    }

    // 5. Area of interest
    if (lecturer.areaInterest && lecturer.areaInterest.length > 0) {
        sections.push(`Lĩnh vực quan tâm: ${lecturer.areaInterest.join(', ')}`)
    }

    // 6. Publications (top 5 most cited)
    if (lecturer.publications && lecturer.publications.length > 0) {
        const topPubs = lecturer.publications
            .sort((a, b) => (b.citations || 0) - (a.citations || 0))
            .slice(0, 5)
            .map((p) => `- ${p.title} (${p.year}${p.citations ? `, ${p.citations} citations` : ''})`)
            .join('\n')

        sections.push(`\nCông trình nghiên cứu:\n${topPubs}`)
    }

    // 7. Keywords extraction từ publications
    if (lecturer.publications && lecturer.publications.length > 0) {
        const keywords = lecturer.publications
            .map((p) => p.title)
            .join(' ')
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 4) // Lọc từ ngắn
            .slice(0, 20) // Top 20 keywords
            .join(' ')

        sections.push(`\nTừ khóa nghiên cứu: ${keywords}`)
    }

    return sections.join('\n').trim()
}

// Run script
bootstrap()
