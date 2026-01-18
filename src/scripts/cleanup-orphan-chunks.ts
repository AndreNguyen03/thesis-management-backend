import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../modules/knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../modules/knowledge-source/schemas/knowledge-source.schema'

/**
 * Cleanup script to remove orphan knowledge_chunks
 * (chunks whose source_id doesn't match any knowledge_source)
 *
 * Usage:
 *   npx ts-node src/scripts/cleanup-orphan-chunks.ts
 */

async function bootstrap() {
    console.log('🗑️  Starting orphan chunks cleanup...')

    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const knowledgeChunkModel = app.get<Model<KnowledgeChunk>>('KnowledgeChunkModel')
        const knowledgeSourceModel = app.get<Model<KnowledgeSource>>('KnowledgeSourceModel')

        // 1. Find orphan chunks
        const orphanChunks = await knowledgeChunkModel.aggregate([
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
                $project: { _id: 1, source_id: 1 }
            }
        ])

        console.log(`📋 Found ${orphanChunks.length} orphan chunks`)

        if (orphanChunks.length === 0) {
            console.log('✅ No orphan chunks to clean up')
            return
        }

        // 2. Ask for confirmation (in production, use readline or CLI args)
        console.log('\n⚠️  WARNING: This will permanently delete orphan chunks!')
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...')
        await new Promise((resolve) => setTimeout(resolve, 5000))

        // 3. Delete orphan chunks
        const orphanIds = orphanChunks.map((chunk) => chunk._id)
        const deleteResult = await knowledgeChunkModel.deleteMany({
            _id: { $in: orphanIds }
        })

        console.log(`\n✅ Deleted ${deleteResult.deletedCount} orphan chunks`)
    } catch (error) {
        console.error('❌ Error during cleanup:', error)
        throw error
    } finally {
        await app.close()
    }
}

bootstrap()
