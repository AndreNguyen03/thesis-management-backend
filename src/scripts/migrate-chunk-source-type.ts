import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../modules/knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../modules/knowledge-source/schemas/knowledge-source.schema'

/**
 * Migration script to add source_type to existing knowledge_chunks
 * by looking up the source_type from knowledge_sources
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-chunk-source-type.ts
 */

async function bootstrap() {
    console.log('🚀 Starting KnowledgeChunk source_type migration...')
    console.log('='.repeat(60))

    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const knowledgeChunkModel = app.get<Model<KnowledgeChunk>>('KnowledgeChunkModel')
        const knowledgeSourceModel = app.get<Model<KnowledgeSource>>('KnowledgeSourceModel')

        // 1. Đếm tổng số chunks cần migrate
        const totalChunks = await knowledgeChunkModel.countDocuments({
            source_type: { $exists: false }
        })

        console.log(`📊 Found ${totalChunks} chunks without source_type`)

        if (totalChunks === 0) {
            console.log('✅ All chunks already have source_type. Nothing to migrate.')
            return
        }

        // 2. Lấy danh sách unique source_ids cần xử lý
        const uniqueSourceIds = await knowledgeChunkModel.distinct('source_id', {
            source_type: { $exists: false }
        })

        console.log(`\n📦 Found ${uniqueSourceIds.length} unique knowledge sources to process`)
        console.log('='.repeat(60))

        let processedChunks = 0
        let errorCount = 0

        // 3. Xử lý từng source_id
        for (let i = 0; i < uniqueSourceIds.length; i++) {
            const sourceId = uniqueSourceIds[i]
            const progress = Math.round(((i + 1) / uniqueSourceIds.length) * 100)

            try {
                // Tìm knowledge source
                const knowledgeSource = await knowledgeSourceModel.findById(sourceId).lean()

                if (!knowledgeSource) {
                    console.log(`⚠️  [${i + 1}/${uniqueSourceIds.length}] Source ${sourceId} not found - skipping`)
                    errorCount++
                    continue
                }

                // Đếm chunks cần update
                const chunkCount = await knowledgeChunkModel.countDocuments({
                    source_id: sourceId,
                    source_type: { $exists: false }
                })

                // Update tất cả chunks của source này
                const updateResult = await knowledgeChunkModel.updateMany(
                    {
                        source_id: sourceId,
                        source_type: { $exists: false }
                    },
                    {
                        $set: {
                            source_type: knowledgeSource.source_type
                        }
                    }
                )

                processedChunks += updateResult.modifiedCount

                console.log(
                    `✅ [${i + 1}/${uniqueSourceIds.length}] (${progress}%) Updated ${updateResult.modifiedCount}/${chunkCount} chunks for ${knowledgeSource.source_type} source: ${knowledgeSource.name}`
                )
            } catch (error) {
                console.error(`❌ Error processing source ${sourceId}:`, error.message)
                errorCount++
            }
        }

        // 4. Verification
        console.log('\n' + '='.repeat(60))
        console.log('📋 MIGRATION SUMMARY:')
        console.log('='.repeat(60))
        console.log(`✅ Total chunks processed: ${processedChunks}`)
        console.log(`❌ Errors encountered: ${errorCount}`)

        const remainingChunks = await knowledgeChunkModel.countDocuments({
            source_type: { $exists: false }
        })

        console.log(`\n🔍 Verification: ${remainingChunks} chunks still without source_type`)

        if (remainingChunks > 0) {
            console.log('\n⚠️  Some chunks still missing source_type. Investigating...')

            // Tìm các chunks orphan (không có source tương ứng)
            const orphanChunks = await knowledgeChunkModel.aggregate([
                {
                    $match: { source_type: { $exists: false } }
                },
                {
                    $lookup: {
                        from: 'knowledge_sources',
                        localField: 'source_id',
                        foreignField: '_id',
                        as: 'source'
                    }
                },
                {
                    $match: { source: { $size: 0 } }
                },
                {
                    $project: { _id: 1, source_id: 1, text: 1 }
                },
                { $limit: 5 }
            ])

            if (orphanChunks.length > 0) {
                console.log(`\n🗑️  Found ${orphanChunks.length} orphan chunks (no matching knowledge_source):`)
                orphanChunks.forEach((chunk, idx) => {
                    console.log(`   ${idx + 1}. Chunk ${chunk._id} → source_id: ${chunk.source_id}`)
                    console.log(`      Text preview: ${chunk.text.substring(0, 100)}...`)
                })
                console.log('\n💡 Consider running cleanup script to remove orphan chunks')
            }
        } else {
            console.log('\n✅ ✅ ✅ MIGRATION COMPLETED SUCCESSFULLY!')
        }

        // 5. Create index if not exists
        console.log('\n📊 Checking source_type index...')
        const indexes = await knowledgeChunkModel.collection.indexes()
        const hasSourceTypeIndex = indexes.some((idx: any) => idx.key && idx.key.source_type)

        if (!hasSourceTypeIndex) {
            console.log('🔧 Creating index on source_type...')
            await knowledgeChunkModel.collection.createIndex({ source_type: 1 })
            console.log('✅ Index created on source_type')
        } else {
            console.log('✅ Index already exists on source_type')
        }

        // 6. Statistics by source type
        console.log('\n' + '='.repeat(60))
        console.log('📊 CHUNKS BY SOURCE TYPE:')
        console.log('='.repeat(60))

        const statsByType = await knowledgeChunkModel.aggregate([
            {
                $group: {
                    _id: '$source_type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ])

        statsByType.forEach((stat) => {
            console.log(`   ${stat._id || 'MISSING'}: ${stat.count} chunks`)
        })
    } catch (error) {
        console.error('❌ Fatal error during migration:', error)
        throw error
    } finally {
        await app.close()
        console.log('\n✅ Migration script completed')
    }
}

// Run migration
bootstrap()
