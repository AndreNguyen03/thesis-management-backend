const { MongoClient, ObjectId } = require('mongodb')

const uri = 'mongodb+srv://ngocanhdeptrai:vNoShiqnopbTDnfM@cluster0.dsvthfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' // Change if needed
const dbName = 'thesis-db' // Change to your database name
const collectionName = 'concepts'

const allowedFields = ['_id', 'key', 'label', 'aliases', 'description']

function cleanConcept(concept) {
    const cleaned = {}
    for (const field of allowedFields) {
        if (concept[field] !== undefined) cleaned[field] = concept[field]
    }
    // Ensure _id is ObjectId
    if (cleaned._id && typeof cleaned._id === 'string') cleaned._id = new ObjectId(cleaned._id)
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

        // 2. Clean concepts
        const cleaned = allConcepts.map(cleanConcept)

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
