// Script to remove all documents from the 'concepts' collection in MongoDB
// Usage: node clear_concepts_collection.js

const { MongoClient } = require('mongodb')

const uri = 'mongodb://localhost:27017' // Change if needed
const dbName = 'your_db_name' // Change to your database name
const collectionName = 'concepts'

async function clearConcepts() {
    const client = new MongoClient(uri)
    try {
        await client.connect()
        const db = client.db(dbName)
        const result = await db.collection(collectionName).deleteMany({})
        console.log(`Deleted ${result.deletedCount} documents from '${collectionName}' collection.`)
    } catch (err) {
        console.error('Error clearing concepts collection:', err)
    } finally {
        await client.close()
    }
}

clearConcepts()
