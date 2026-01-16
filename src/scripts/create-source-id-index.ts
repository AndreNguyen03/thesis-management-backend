/**
 * Migration script to create index on source_id field in knowledge_chunks collection
 * Run this once to fix the "Path 'source_id' needs to be indexed" error
 *
 * Usage: node --loader ts-node/esm src/scripts/create-source-id-index.ts
 * Or directly connect to MongoDB and run: db.knowledge_chunks.createIndex({ source_id: 1 })
 */

const { MongoClient } = require('mongodb')

async function createIndex() {
    // Sử dụng connection string từ môi trường hoặc default
    const uri =
        process.env.MONGODB_URI ||
        'mongodb+srv://khoa-luan-admin:khoa-luan-admin@clusterkhoa-luan.rhzol.mongodb.net/clusterKhoaLuan'

    const client = new MongoClient(uri)

    try {
        console.log('🔌 Connecting to MongoDB...')
        await client.connect()
        console.log('✅ Connected to MongoDB')

        const db = client.db()
        const collection = db.collection('knowledge_chunks')

        console.log('🔍 Checking existing indexes...')
        const existingIndexes = await collection.indexes()
        console.log(
            'Current indexes:',
            existingIndexes.map((idx: any) => idx.name)
        )

        const hasSourceIdIndex = existingIndexes.some((idx: any) => idx.key && idx.key.source_id)

        if (hasSourceIdIndex) {
            console.log('✅ Index on source_id already exists')
        } else {
            console.log('📝 Creating index on source_id...')
            await collection.createIndex({ source_id: 1 })
            console.log('✅ Index created successfully')
        }

        console.log('\n📊 Final indexes:')
        const finalIndexes = await collection.indexes()
        finalIndexes.forEach((idx: any) => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
        })

        console.log('\n✅ Migration completed successfully')
    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    } finally {
        await client.close()
        process.exit(0)
    }
}

createIndex()

createIndex()
