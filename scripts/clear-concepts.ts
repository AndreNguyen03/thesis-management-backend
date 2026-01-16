/**
 * Script to delete all CONCEPT knowledge sources and their associated chunks
 */

import { connect, connection } from 'mongoose'

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://ngocanhdeptrai:vNoShiqnopbTDnfM@cluster0.dsvthfm.mongodb.net/thesis-db?retryWrites=true&w=majority&appName=Cluster0'

async function clearConcepts() {
    try {
        console.log('Connecting to MongoDB...')
        await connect(MONGO_URI)
        console.log('Connected successfully')

        const db = connection.db
        if (!db) {
            throw new Error('Database connection not established')
        }

        // Step 1: Find all KnowledgeSource with source_type = CONCEPT
        const conceptSources = await db.collection('knowledge_sources').find({ source_type: 'CONCEPT' }).toArray()

        console.log(`Found ${conceptSources.length} CONCEPT knowledge sources`)
        console.log(
            'Sample sources:',
            conceptSources.slice(0, 3).map((s) => ({ id: s._id, name: s.name, type: s.source_type }))
        )

        if (conceptSources.length === 0) {
            console.log('No concepts to delete')
            await connection.close()
            return
        }

        // Step 2: Get all source IDs
        const sourceIds = conceptSources.map((s) => s._id)

        // Step 3: Count and verify KnowledgeChunk with source_id in sourceIds
        const chunksToDelete = await db
            .collection('knowledge_chunks')
            .find({ source_id: { $in: sourceIds.map((id) => id.toString()) } })
            .toArray()

        console.log(`Found ${chunksToDelete.length} knowledge chunks with CONCEPT source_id`)
        console.log(
            'Sample chunks:',
            chunksToDelete
                .slice(0, 3)
                .map((c) => ({ id: c._id, source_id: c.source_id, text: c.text?.substring(0, 50) }))
        )

        // Verify: Check that chunks belong to CONCEPT sources
        const verifiedChunks = await db
            .collection('knowledge_chunks')
            .aggregate([
                { $match: { source_id: { $in: sourceIds.map((id) => id.toString()) } } },
                { $lookup: { from: 'knowledge_sources', localField: 'source_id', foreignField: '_id', as: 'source' } },
                { $unwind: '$source' },
                { $group: { _id: '$source.source_type', count: { $sum: 1 } } }
            ])
            .toArray()

        console.log('Verification - Chunks by source type:', verifiedChunks)

        // Step 4: Delete all KnowledgeChunk with source_id in sourceIds
        const chunkResult = await db
            .collection('knowledge_chunks')
            .deleteMany({ source_id: { $in: sourceIds.map((id) => id.toString()) } })

        console.log(`Deleted ${chunkResult.deletedCount} knowledge chunks`)

        // Step 4: Delete all KnowledgeSource with source_type = CONCEPT
        const sourceResult = await db.collection('knowledge_sources').deleteMany({ source_type: 'CONCEPT' })

        console.log(`Deleted ${sourceResult.deletedCount} knowledge sources`)

        console.log('✅ Successfully cleared all concepts')

        await connection.close()
        console.log('Connection closed')
    } catch (error) {
        console.error('Error clearing concepts:', error)
        process.exit(1)
    }
}

clearConcepts()
