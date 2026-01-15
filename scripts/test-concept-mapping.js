/**
 * Test Concept Mapping
 * Test the text normalizer and concept mapper with real data
 */

const fs = require('fs')
const path = require('path')

const { normalize, normalizeAndTokenize, normalizeArray } = require('./matching/text-normalizer')
const { buildConceptIndex, findConcepts } = require('./matching/concept-indexer')
const { extractLecturerConcepts } = require('./matching/concept-mapper')

async function main() {
    console.log('🧪 Testing Concept Mapping\n')

    // ===== TEST 1: TEXT NORMALIZER =====
    console.log('1️⃣  Testing Text Normalizer')
    console.log('='.repeat(50))

    const testTexts = [
        'Trí tuệ nhân tạo & học máy',
        'Machine Learning, Deep Learning',
        'Xử lý ngôn ngữ tự nhiên (NLP)',
        'Large Language Model',
        'Computer Vision và IoT'
    ]

    testTexts.forEach((text) => {
        const normalized = normalize(text)
        const tokens = normalizeAndTokenize(text)
        console.log(`\nInput:  "${text}"`)
        console.log(`Normalized: "${normalized}"`)
        console.log(`Tokens: [${tokens.join(', ')}]`)
    })

    console.log('\n')

    // ===== TEST 2: CONCEPT INDEX =====
    console.log('2️⃣  Testing Concept Index')
    console.log('='.repeat(50))

    const conceptsPath = path.join(__dirname, 'concepts-export.json')
    const concepts = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'))

    console.log(`\nLoaded ${concepts.length} concepts`)

    const conceptIndex = buildConceptIndex(concepts)

    console.log(`Built index with ${conceptIndex.byKey.size} concepts`)
    console.log(`Label index: ${conceptIndex.byLabel.size} entries`)
    console.log(`Alias index: ${conceptIndex.byAlias.size} entries`)

    // Sample concepts
    console.log('\nSample concepts by depth:')
    const byDepth = new Map()

    for (const [key, concept] of conceptIndex.byKey.entries()) {
        if (!byDepth.has(concept.depth)) {
            byDepth.set(concept.depth, [])
        }
        byDepth.get(concept.depth).push(concept)
    }

    for (const [depth, conceptList] of Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`  Depth ${depth}: ${conceptList.length} concepts`)
        console.log(
            `    Examples: ${conceptList
                .slice(0, 3)
                .map((c) => c.key)
                .join(', ')}`
        )
    }

    console.log('\n')

    // ===== TEST 3: CONCEPT LOOKUP =====
    console.log('3️⃣  Testing Concept Lookup')
    console.log('='.repeat(50))

    const testQueries = [
        'machine learning',
        'hoc may',
        'ai',
        'tri tue nhan tao',
        'nlp',
        'xu ly ngon ngu',
        'deep learning',
        'data science'
    ]

    testQueries.forEach((query) => {
        const normalized = normalize(query)
        const found = findConcepts(normalized, conceptIndex)

        console.log(`\nQuery: "${query}" → "${normalized}"`)
        if (found.length > 0) {
            console.log(`  ✅ Found ${found.length} concept(s):`)
            found.forEach((c) => {
                console.log(`     - ${c.key} (${c.label}) [depth: ${c.depth}, role: ${c.role}]`)
            })
        } else {
            console.log(`  ❌ No concepts found`)
        }
    })

    console.log('\n')

    // ===== TEST 4: LECTURER CONCEPT EXTRACTION =====
    console.log('4️⃣  Testing Lecturer Concept Extraction')
    console.log('='.repeat(50))

    const lecturersPath = path.join(__dirname, 'lecturers-export.json')
    const lecturers = JSON.parse(fs.readFileSync(lecturersPath, 'utf-8'))

    // Pick a few sample lecturers
    const samples = lecturers.filter((l) => l.areaInterest && l.areaInterest.length > 0).slice(0, 3)

    console.log(`\nTesting with ${samples.length} sample lecturers:\n`)

    samples.forEach((lecturer, idx) => {
        console.log(`\n${idx + 1}. Lecturer: ${lecturer.title}`)
        console.log(`   Area Interest: ${lecturer.areaInterest?.join(', ') || 'N/A'}`)
        console.log(`   Research: ${lecturer.researchInterests?.join(', ') || 'N/A'}`)

        const result = extractLecturerConcepts(lecturer, conceptIndex)

        console.log(`\n   📊 Results:`)
        console.log(`      Concepts found: ${result.concepts.length}`)
        console.log(`      - From areaInterest: ${result.stats.fromAreaInterest}`)
        console.log(`      - From researchInterests: ${result.stats.fromResearchInterests}`)
        console.log(`      - From publications: ${result.stats.fromPublications}`)

        if (result.concepts.length > 0) {
            console.log(`\n   📋 Extracted Concepts:`)
            result.concepts.forEach((c) => {
                const sources = c.sources ? c.sources.join(', ') : c.source
                console.log(`      - ${c.label} (${c.key})`)
                console.log(`        depth: ${c.depth}, sources: [${sources}]`)
            })
        }

        if (result.unmatchedTokens.length > 0) {
            console.log(`\n   ⚠️  Unmatched tokens (${result.unmatchedTokens.length}):`)
            console.log(`      ${result.unmatchedTokens.slice(0, 10).join(', ')}`)
            if (result.unmatchedTokens.length > 10) {
                console.log(`      ... and ${result.unmatchedTokens.length - 10} more`)
            }
        }

        console.log('')
    })

    console.log('\n✅ All tests completed!')
}

main().catch((err) => {
    console.error('❌ Test failed:', err)
    process.exit(1)
})
