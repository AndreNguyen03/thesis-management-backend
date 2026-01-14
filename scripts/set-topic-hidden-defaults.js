const mongoose = require('mongoose')

const mongoUri =
    process.env.MONGO_URI || ''

const dbName = process.env.MONGO_DB_NAME || ''

function buildMongoUri(baseUri, dbName) {
    // Tách query string nếu có
    const [withoutQuery, query] = baseUri.split('?')

    // Xóa slash dư
    const cleanBase = withoutQuery.replace(/\/+$/, '')

    // Gắn db name
    const uriWithDb = `${cleanBase}/${dbName}`

    // Gắn lại query (nếu có)
    return query ? `${uriWithDb}?${query}` : uriWithDb
}

const uri = buildMongoUri(mongoUri, dbName)

async function main() {
    await mongoose.connect(uri)

    const db = mongoose.connection.db
    console.log('Connected to MongoDB:', uri.replace(/\/\/.*@/, '//***:***@'))

    console.log('Updating existing documents to add isHiddenInLibrary defaults...')
    const res = await db.collection('topics').updateMany(
        { isHiddenInLibrary: { $exists: false } },
        {
            $set: {
                isHiddenInLibrary: false,
                hiddenByAdmin: null,
                hiddenAt: null
            }
        }
    )

    console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount)

    console.log('Creating indexes...')
    await db.collection('topics').createIndex({
        isPublishedToLibrary: 1,
        isHiddenInLibrary: 1
    })
    await db.collection('topics').createIndex({
        isHiddenInLibrary: 1
    })

    console.log('Done')
    await mongoose.disconnect()
    process.exit(0)
}

main().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
