const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

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

const uri = buildMongoUri(mongoUri, dbName)

async function main() {
    await mongoose.connect(uri)
    const db = mongoose.connection.db

    console.log('Connected to MongoDB:', uri.replace(/\/\/.*@/, '//***:***@'))

    console.log('Exporting concepts collection...')

    const outputPath = path.join(process.cwd(), 'concepts-export.json')

    // ===== CÁCH 1: dataset nhỏ / vừa =====
    // const data = await db.collection('concepts').find({}).toArray()
    // fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')

    // exclude large `embedding` field at query time
    const data = await db.collection('concepts').find({}).project({ embedding: 0 }).toArray()

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')

    console.log('Total:', data.length)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch((err) => {
    console.error('Export failed:', err)
    process.exit(1)
})
