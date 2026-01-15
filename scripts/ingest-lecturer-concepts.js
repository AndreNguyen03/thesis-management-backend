/**
 * Lecturer Ingest Script - Pipeline 1, Step 4
 * Process lecturers: extract concepts, save to DB
 */

const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

const { buildConceptIndex } = require('./matching/concept-indexer')
const { extractLecturerConcepts } = require('./matching/concept-mapper')

// MongoDB config
const mongoUri =
    process.env.MONGO_URI ||
    'mongodb+srv://ngocanhdeptrai:vNoShiqnopbTDnfM@cluster0.dsvthfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const dbName = process.env.MONGO_DB_NAME || 'thesis-db'

function buildMongoUri(baseUri, dbName) {
    const [withoutQuery, query] = baseUri.split('?')
    const cleanBase = withoutQuery.replace(/\/+$/, '')
    const uriWithDb = `${cleanBase}/${dbName}`
    return query ? `${uriWithDb}?${query}` : uriWithDb
}

async function main() {
    console.log('🚀 Starting Lecturer Concept Ingest...\n')

    // Load concepts
    console.log('📚 Loading concept tree...')
    const conceptsPath = path.join(__dirname, 'concepts-export.json')
    const concepts = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'))
    console.log(`   Loaded ${concepts.length} concepts`)

    // Build concept index
    console.log('🔍 Building concept index...')
    const conceptIndex = buildConceptIndex(concepts)
    console.log(`   Indexed ${conceptIndex.byKey.size} concepts`)
    console.log(`   - By label: ${conceptIndex.byLabel.size} entries`)
    console.log(`   - By alias: ${conceptIndex.byAlias.size} entries\n`)

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...')
    const uri = buildMongoUri(mongoUri, dbName)
    await mongoose.connect(uri)
    const db = mongoose.connection.db
    console.log('   Connected!\n')

    // Fetch lecturers
    console.log('👨‍🏫 Fetching lecturers...')
    const lecturers = await db.collection('lecturers').find({}).toArray()
    console.log(`   Found ${lecturers.length} lecturers\n`)

    // Process each lecturer
    console.log('⚙️  Processing lecturers...')
    const stats = {
        total: lecturers.length,
        processed: 0,
        withConcepts: 0,
        totalConcepts: 0,
        totalUnmatched: 0,
        errors: 0
    }

    const bulkOps = []
    const unmatchedByLecturer = []

    for (const lecturer of lecturers) {
        try {
            const result = extractLecturerConcepts(lecturer, conceptIndex)

            stats.processed++

            if (result.concepts.length > 0) {
                stats.withConcepts++
                stats.totalConcepts += result.concepts.length

                // Prepare update
                bulkOps.push({
                    updateOne: {
                        filter: { _id: lecturer._id },
                        update: {
                            $set: {
                                concepts: result.concepts,
                                conceptStats: result.stats,
                                conceptsUpdatedAt: new Date()
                            }
                        }
                    }
                })
            }

            if (result.unmatchedTokens.length > 0) {
                stats.totalUnmatched += result.unmatchedTokens.length
                unmatchedByLecturer.push({
                    lecturerId: lecturer._id,
                    unmatchedTokens: result.unmatchedTokens
                })
            }

            // Progress
            if (stats.processed % 10 === 0) {
                process.stdout.write(`\r   Processed: ${stats.processed}/${stats.total}`)
            }
        } catch (error) {
            console.error(`\n   ❌ Error processing lecturer ${lecturer._id}:`, error.message)
            stats.errors++
        }
    }

    console.log(`\n   ✅ Processed: ${stats.processed}/${stats.total}\n`)

    // Save to database
    if (bulkOps.length > 0) {
        console.log('💾 Saving to database...')
        const result = await db.collection('lecturers').bulkWrite(bulkOps)
        console.log(`   Updated ${result.modifiedCount} lecturers\n`)
    }

    // Save unmatched tokens for review
    const unmatchedPath = path.join(__dirname, 'unmatched-tokens-lecturers.json')
    fs.writeFileSync(unmatchedPath, JSON.stringify(unmatchedByLecturer, null, 2), 'utf-8')

    // Print summary
    console.log('📊 Summary:')
    console.log(`   Total lecturers: ${stats.total}`)
    console.log(`   Processed: ${stats.processed}`)
    console.log(`   With concepts: ${stats.withConcepts}`)
    console.log(`   Total concepts extracted: ${stats.totalConcepts}`)
    console.log(`   Avg concepts per lecturer: ${(stats.totalConcepts / stats.withConcepts).toFixed(2)}`)
    console.log(`   Total unmatched tokens: ${stats.totalUnmatched}`)
    console.log(`   Errors: ${stats.errors}`)
    console.log(`\n📁 Unmatched tokens saved to: ${unmatchedPath}`)

    // Disconnect
    await mongoose.disconnect()
    console.log('\n✅ Done!')
    process.exit(0)
}

main().catch((err) => {
    console.error('❌ Ingest failed:', err)
    process.exit(1)
})
