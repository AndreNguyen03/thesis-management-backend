// Script to clean concept objects to match the current Concept schema
// Removes fields not in the schema: embedding, __v, etc.
// Keeps: _id, key, label, level, parentId, aliases, description, createdAt, updatedAt

const fs = require('fs')

const INPUT = 'concept-candidates.json' // or your input file
const OUTPUT = 'concepts-cleaned.json'

const allowedFields = ['_id', 'key', 'label', 'level', 'parentId', 'aliases', 'description', 'createdAt', 'updatedAt']

function cleanConcept(concept) {
    const cleaned = {}
    for (const field of allowedFields) {
        if (concept[field] !== undefined) cleaned[field] = concept[field]
    }
    return cleaned
}

function main() {
    const raw = fs.readFileSync(INPUT, 'utf8')
    const data = JSON.parse(raw)
    const cleaned = Array.isArray(data) ? data.map(cleanConcept) : [cleanConcept(data)]
    fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2), 'utf8')
    console.log(`Cleaned concepts written to ${OUTPUT}`)
}

main()
