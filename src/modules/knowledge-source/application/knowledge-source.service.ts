import { forwardRef, Injectable } from '@nestjs/common'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model, Document } from 'mongoose'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { RequestKnowledgeSourceDto } from '../dto/request-get-knowledge-source.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { UpdateKnowledgeSourceDto } from '../dto/update-knowledge-source.dto'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { TopicStatus } from '../../topics/enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { SourceType } from '../enums/source_type.enum'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { CreateKnowledgeChunksProvider } from './create-knowledge-chunks.provider'
import { RetrievalProvider } from '../../chatbot/providers/retrieval.provider'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { buildProfileText } from '../utils/build-lecturer-profile.utils'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { ProcessingStatus } from '../enums/processing-status.enum'

@Injectable()
export class KnowledgeSourceService {
    constructor(
        private readonly paginationProvider: PaginationProvider,
        @InjectModel(KnowledgeChunk.name)
        private readonly knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(Lecturer.name)
        private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(KnowledgeSource.name)
        private readonly knowledgeSourceModel: Model<KnowledgeSource & Document>,
        private readonly getTopicProvider: GetTopicProvider,
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider,
        private readonly retrievalProvider: RetrievalProvider,
        @InjectQueue('knowledge-sync-queue') private readonly knowledgeQueue: Queue
    ) {}

    async findAll(query: RequestKnowledgeSourceDto): Promise<Paginated<KnowledgeSource & Document>> {
        // pipeline getting Owner information
        let pipelineSub: any[] = []
        pipelineSub.push({
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner_info'
            }
        })
        pipelineSub.push({
            $addFields: {
                owner_info: { $arrayElemAt: ['$owner_info', 0] }
            }
        })
        // pipelineSub.push({ $unwind: { path: '$owner_info', preserveNullAndEmptyArrays: true } })

        // Implementation for fetching knowledge sources based on the query
        return await this.paginationProvider.paginateQuery(
            {
                limit: query.limit,
                page: query.page
            },
            this.knowledgeSourceModel,
            pipelineSub
        )
    }
    async updateKnowledgeSources(klid: string, query: UpdateKnowledgeSourceDto): Promise<KnowledgeSource | null> {
        const updatedKnowledgeSource = await this.knowledgeSourceModel
            .findByIdAndUpdate(klid, query, { new: true })
            .exec()
        return updatedKnowledgeSource ? updatedKnowledgeSource.toObject() : null
    }
    async syncTopicsDataToKnowledgeSource(periodId: string, userId: string): Promise<{ message: string }> {
        const { total: totalRegistering } = await this.syncRegisteringTopicsDataToKnowledgeSource(periodId, userId)
        const { total: totalInLibrary } = await this.syncTopicsInLibraryDataToKnowledgeSource(periodId, userId)

        return {
            message: `Đã đồng bộ ${totalInLibrary + totalRegistering} đề tài vào nguồn tri thức`
        }
    }

    async syncRegisteringTopicsDataToKnowledgeSource(
        periodId: string,
        userId?: string
    ): Promise<{ message: string; total: number }> {
        //lấy cái đề tài đang mở đăng ký trong kỳ hiện tại
        const registeringTopics = await this.getTopicProvider.getTopicsInPhase(periodId, {
            page: 1,
            limit: 0,
            phase: PeriodPhaseName.OPEN_REGISTRATION
        })
        await this.knowledgeQueue.add('sync-registering-topic-knowledge-source', {
            registeringTopics: registeringTopics.data,
            userId
        })
        console.log(`Đã đồng bộ ${registeringTopics.data.length} đề tài vào nguồn tri thức`)
        return {
            message: `Đã đồng bộ ${registeringTopics.data.length} đề tài vào nguồn tri thức`,
            total: registeringTopics.data.length
        }
    }

    async syncTopicsInLibraryDataToKnowledgeSource(
        periodId: string,
        userId?: string
    ): Promise<{ message: string; total: number }> {
        //lấy tất cả các đề tài trong thư viện
        const topicsInLibrary = await this.getTopicProvider.getTopicsInLibrary(
            {
                page: 1,
                limit: 0,
                status: TopicStatus.Archived
            },
            UserRole.FACULTY_BOARD
        )
        await this.knowledgeQueue.add('sync-topics-in-library-knowledge-source', {
            topicsInLibrary: topicsInLibrary.data,
            userId
        })
        console.log(`Đã đồng bộ ${topicsInLibrary.data.length} đề tài vào nguồn tri thức`)

        return {
            message: `Đã đồng bộ ${topicsInLibrary.data.length} đề tài vào nguồn tri thức`,
            total: topicsInLibrary.data.length
        }
    }
    async syncLecturerProfiles(userId: string): Promise<{ message: string }> {
        try {
            // Xóa data cũ (nếu có)
            // 1. Lấy danh sách knowledge sources cần xóa
            const oldSources = await this.knowledgeSourceModel
                .find({
                    source_type: SourceType.LECTURER_PROFILE
                })
                .select('_id')
                .lean()

            const oldSourceIds = oldSources.map((s) => s._id)

            // 2. Xóa knowledge chunks liên quan
            const deleteChunksResult = await this.knowledgeChunkModel.deleteMany({
                source_id: { $in: oldSourceIds }
            })
            console.log(`🗑️  Deleted ${deleteChunksResult.deletedCount} old lecturer knowledge chunks`)

            // 3. Xóa knowledge sources
            const deleteResult = await this.knowledgeSourceModel.deleteMany({
                source_type: SourceType.LECTURER_PROFILE
            })
            console.log(`🗑️  Deleted ${deleteResult.deletedCount} old lecturer knowledge sources\n`)

            // Lấy tất cả lecturers
            const lecturers = await this.lecturerModel
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
                    const embedding = await this.getEmbeddingProvider.getEmbedding(profileText)
                    console.log(`   ✅ Generated embedding (${embedding.length} dimensions)`)

                    // Tạo knowledge source
                    const knowledgeSource = await this.knowledgeSourceModel.create({
                        name: `Lecturer Profile - ${user.fullName}`,
                        description: `Hồ sơ giảng viên ${user.fullName}`,
                        source_type: SourceType.LECTURER_PROFILE,
                        source_location: user._id.toString(),
                        source_name: user.fullName,
                        source_url: null,
                        status: KnowledgeStatus.ENABLED,
                        // metadata: {
                        //     title: lecturer.title,
                        //     faculty: faculty?.name || 'N/A',
                        //     email: user.email
                        // },
                        owner: userId
                    })
                    console.log(`   📦 Created knowledge source: ${knowledgeSource._id}`)

                    // Tạo knowledge chunk
                    const chunk = await this.knowledgeChunkModel.create({
                        source_id: knowledgeSource._id,
                        text: profileText,
                        plot_embedding_gemini_large: embedding,
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

                    // Cập nhật process status thành completed
                    await this.knowledgeSourceModel.findByIdAndUpdate(knowledgeSource._id, {
                        process_status: ProcessingStatus.COMPLETED
                    })
                    console.log(`   ✅ Updated knowledge source status to completed`)

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
            const totalChunks = await this.knowledgeChunkModel.countDocuments({
                'metadata.lecturerId': { $exists: true }
            })
            console.log(`\n🔍 Verification: Found ${totalChunks} lecturer chunks in database`)
        } catch (error) {
            console.error('❌ Fatal error:', error)
        } finally {
            console.log('\n✅ Script completed')
        }
        return { message: `Đã đồng bộ hồ sơ của giảng viên vào nguồn tri thức` }
    }
    async semanticSearchKnowledgeSources(query: string): Promise<KnowledgeChunk[]> {
        const embedding = await this.getEmbeddingProvider.getEmbedding(query)
        return await this.retrievalProvider.searchSimilarDocuments(embedding, {
            limit: 20,
            sourceTypes: [SourceType.URL, SourceType.FILE],
            scoreThreshold: 0.65 // Thêm threshold để đồng nhất với tool
        })
    }
    async deleteKnowledgeSource(klid: string): Promise<{ message: string }> {
        //xóa knowledge source
        const deleteKnowledgeSourceResult = await this.knowledgeSourceModel.findByIdAndDelete(klid).exec()
        if (!deleteKnowledgeSourceResult) {
            return { message: 'Không tìm thấy nguồn tri thức để xóa' }
        }
        //xóa knowledge chunks liên quan đến source
        const deleteKnowledgeChunksResult = await this.knowledgeChunkModel
            .deleteMany({ source_id: new mongoose.Types.ObjectId(klid) })
            .exec()
        return {
            message: `Đã xóa nguồn tri thức và ${deleteKnowledgeChunksResult.deletedCount} đoạn tri thức liên quan`
        }
    }
}
