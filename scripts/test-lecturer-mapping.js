const mongoose = require('mongoose')

const mongoUri =
    process.env.MONGO_URI ||
    'mongodb+srv://ngocanhdeptrai:vNoShiqnopbTDnfM@cluster0.dsvthfm.mongodb.net/?retryWrites=true&w=majority'
const dbName = process.env.MONGO_DB_NAME || 'thesis-db'

function buildMongoUri(baseUri, dbName) {
    const [withoutQuery, query] = baseUri.split('?')
    const cleanBase = withoutQuery.replace(/\/+$/, '')
    const uriWithDb = `${cleanBase}/${dbName}`
    return query ? `${uriWithDb}?${query}` : uriWithDb
}

const uri = buildMongoUri(mongoUri, dbName)

function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

async function main() {
    await mongoose.connect(uri)
    const db = mongoose.connection.db
    console.log('Connected to MongoDB')

    const lecturers = await db.collection('lecturers').find({ deleted_at: null }).toArray()
    const concepts = await db.collection('concepts').find({}).toArray()

    console.log(`Lecturers: ${lecturers.length}`)
    console.log(`Concepts: ${concepts.length}`)

    const conceptIndex = concepts.map((c) => ({
        _id: c._id.toString(),
        key: c.key,
        label: normalize(c.label),
        aliases: (c.aliases || []).map(normalize),
        parentId: c.parentId?.toString() || null,
        level: c.level
    }))

    const results = []

    for (const lec of lecturers) {
        const profileText = [
            ...(lec.areaInterest || []),
            ...(lec.researchInterests || []),
            ...(lec.publications || []).flatMap((p) => [p.title, p.journal, p.conference])
        ]
            .filter(Boolean)
            .join(' ')

        const normProfile = normalize(profileText)

        const matchedConcepts = new Map()

        for (const c of conceptIndex) {
            if (normProfile.includes(c.label)) {
                matchedConcepts.set(c._id, { key: c.key, via: 'label' })
                continue
            }
            for (const a of c.aliases) {
                if (normProfile.includes(a)) {
                    matchedConcepts.set(c._id, { key: c.key, via: 'alias' })
                    break
                }
            }
        }

        // Add parents (hierarchy grounding)
        for (const cId of Array.from(matchedConcepts.keys())) {
            let parentId = conceptIndex.find((c) => c._id === cId)?.parentId
            while (parentId) {
                if (!matchedConcepts.has(parentId)) {
                    const p = conceptIndex.find((c) => c._id === parentId)
                    if (p) matchedConcepts.set(parentId, { key: p.key, via: 'parent' })
                }
                parentId = conceptIndex.find((c) => c._id === parentId)?.parentId
            }
        }

        results.push({
            lecturerId: lec._id.toString(),
            title: lec.title,
            matchedConcepts: Array.from(matchedConcepts.values())
        })
    }

    console.log('=== SAMPLE RESULT ===')
    console.dir(results.slice(0, 3), { depth: null })

    await mongoose.disconnect()
    process.exit(0)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
