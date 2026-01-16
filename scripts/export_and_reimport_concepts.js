// Script to export all concepts, clean them, and re-import to match the current schema
// Usage: node export_and_reimport_concepts.js

const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')

const uri = 'mongodb://localhost:27017' // Change if needed
const dbName = 'your_db_name' // Change to your database name
const collectionName = 'concepts'
const EXPORT_FILE = 'concepts-export.json'
const CLEANED_FILE = 'concepts-cleaned.json'

const allowedFields = ['_id', 'key', 'label', 'level', 'parentId', 'aliases', 'description', 'createdAt', 'updatedAt']

function cleanConcept(concept) {
    const cleaned = {}
    for (const field of allowedFields) {
        if (concept[field] !== undefined) cleaned[field] = concept[field]
    }
    // Ensure ObjectId for _id and parentId
    if (cleaned._id && typeof cleaned._id === 'string') cleaned._id = new ObjectId(cleaned._id)
    if (cleaned.parentId && typeof cleaned.parentId === 'string') cleaned.parentId = new ObjectId(cleaned.parentId)
    return cleaned
}

async function main() {
    const client = new MongoClient(uri)
    try {
        await client.connect()
        const db = client.db(dbName)
        const collection = db.collection(collectionName)

        // 1. Export all concepts
        const allConcepts = await collection.find({}).toArray()
        fs.writeFileSync(EXPORT_FILE, JSON.stringify(allConcepts, null, 2), 'utf8')
        console.log(`Exported ${allConcepts.length} concepts to ${EXPORT_FILE}`)

        // 2. Clean concepts
        const cleaned = allConcepts.map(cleanConcept)
        fs.writeFileSync(CLEANED_FILE, JSON.stringify(cleaned, null, 2), 'utf8')
        console.log(`Cleaned concepts written to ${CLEANED_FILE}`)

        // 3. Remove all from collection
        await collection.deleteMany({})
        console.log('Cleared concepts collection.')

        // 4. Insert cleaned concepts
        if (cleaned.length > 0) {
            await collection.insertMany(cleaned)
            console.log(`Inserted ${cleaned.length} cleaned concepts.`)
        }
    } catch (err) {
        console.error('Error:', err)
    } finally {
        await client.close()
    }
}

main()
