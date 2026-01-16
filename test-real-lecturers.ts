/**
 * Test Trie matching with real lecturer data
 */

import * as fs from 'fs'
import * as path from 'path'
import { preprocessText } from './src/modules/matching/utils/text-processor.util'
import { TrieIndex, buildTrieIndex } from './src/modules/matching/utils/trie-index.util'

// Load ontology
const ontologyPath = path.join(__dirname, 'src', 'scripts', 'ontology-concepts.json')
const concepts = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'))

// Real lecturer data
const lecturers = [
    {
        name: 'Lecturer 1 - AI & Data Science',
        areaInterest: [
            'Trí tuệ nhân tạo',
            'Khoa học dữ liệu',
            'Deep Learning',
            'Phân tích dữ liệu truyền thông',
            'Dữ liệu lớn',
            'Phát triển ứng dụng thông minh'
        ],
        researchInterests: [
            'Data Science',
            'Big Data',
            'Visible light communication',
            'Optical camera communication',
            'Vehicle communication and sensing'
        ]
    },
    {
        name: 'Lecturer 2 - Data Mining & Web',
        areaInterest: ['Data Mining'],
        researchInterests: ['Các phương pháp thiết kế và phát triển Web']
    },
    {
        name: 'Lecturer 3 - NLP & ML',
        areaInterest: ['Natural Language Processing', 'Machine learning'],
        researchInterests: [
            'Phát triển ứng dụng Web và Mobile',
            'Phương pháp và công cụ phát triển phần mềm',
            'Data Analysis'
        ]
    },
    {
        name: 'Lecturer 4 - Big Data & Software',
        areaInterest: ['Data Mining', 'Big Data'],
        researchInterests: ['Phương pháp và công cụ phát triển phần mềm', '.NET', 'Java', 'AI']
    },
    {
        name: 'Lecturer 5 - Game Development',
        areaInterest: ['Các kĩ thuật đồ họa nâng cao trong game 3D', 'các giải pháp server cho game trực tuyến'],
        researchInterests: ['Quy trình và công nghệ sản xuất game']
    },
    {
        name: 'Lecturer 6 - Search & Mobile',
        areaInterest: ['Search Engine'],
        researchInterests: ['Lập trình trên thiết bị di động', 'Lập trình Game', 'Công nghệ .Net']
    }
]

console.log('='.repeat(80))
console.log('REAL LECTURER DATA - TRIE MATCHING TEST')
console.log('='.repeat(80))
console.log(`Ontology: ${concepts.length} concepts`)
console.log(`Lecturers: ${lecturers.length}`)
console.log('='.repeat(80))
console.log()

// Build Trie
console.log('Building Trie index...')
const buildStart = Date.now()
const trie = buildTrieIndex(concepts, preprocessText)
const buildTime = Date.now() - buildStart
const stats = trie.getStats()
console.log(`✅ Built in ${buildTime}ms (${stats.totalNodes} nodes, ${stats.totalConcepts} concepts)`)
console.log()

// Process each lecturer
let totalQueries = 0
let totalMatches = 0
let totalTime = 0

for (const lecturer of lecturers) {
    console.log('━'.repeat(80))
    console.log(`👤 ${lecturer.name}`)
    console.log('━'.repeat(80))

    const allInterests = [...lecturer.areaInterest, ...lecturer.researchInterests]
    const lecturerMatches = new Map<
        string,
        {
            concept: any
            queries: string[]
            matchedAliases: string[]
            scores: number[]
        }
    >()

    console.log('\n📋 Area of Interest:')
    for (const interest of lecturer.areaInterest) {
        totalQueries++
        const startTime = Date.now()
        const processed = preprocessText(interest)

        // Try different matching strategies
        let matches = trie.searchExact(processed)
        let strategy = 'exact'

        if (matches.length === 0) {
            const fuzzy = trie.searchFuzzyTokens(processed)
            if (fuzzy.length > 0) {
                matches = fuzzy.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
                strategy = 'fuzzy'
            }
        }

        if (matches.length === 0) {
            const substring = trie.searchSubstring(processed)
            if (substring.length > 0) {
                matches = substring.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
                strategy = 'substring'
            }
        }

        const queryTime = Date.now() - startTime
        totalTime += queryTime

        console.log(`  • "${interest}"`)
        console.log(`    Preprocessed: "${processed}"`)

        if (matches.length > 0) {
            totalMatches += matches.length
            console.log(`    ✅ ${matches.length} match(es) via ${strategy} (${queryTime}ms)`)

            // Take top 3 matches
            for (let i = 0; i < Math.min(3, matches.length); i++) {
                const match = matches[i]
                const concept = concepts.find((c: any) => c.key === match.conceptKey)
                if (concept) {
                    console.log(`       ${i + 1}. [Depth ${concept.depth}] ${concept.label}`)
                    console.log(`          Key: ${concept.key}`)
                    console.log(`          Matched: "${match.matchedAlias}"`)

                    // Aggregate for summary
                    if (!lecturerMatches.has(concept.key)) {
                        lecturerMatches.set(concept.key, {
                            concept,
                            queries: [],
                            matchedAliases: [],
                            scores: []
                        })
                    }
                    const entry = lecturerMatches.get(concept.key)!
                    entry.queries.push(interest)
                    entry.matchedAliases.push(match.matchedAlias)
                    entry.scores.push(1.0)
                }
            }
        } else {
            console.log(`    ❌ No match (${queryTime}ms)`)
        }
    }

    console.log('\n🔬 Research Interests:')
    for (const interest of lecturer.researchInterests) {
        totalQueries++
        const startTime = Date.now()
        const processed = preprocessText(interest)

        let matches = trie.searchExact(processed)
        let strategy = 'exact'

        if (matches.length === 0) {
            const fuzzy = trie.searchFuzzyTokens(processed)
            if (fuzzy.length > 0) {
                matches = fuzzy.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
                strategy = 'fuzzy'
            }
        }

        if (matches.length === 0) {
            const substring = trie.searchSubstring(processed)
            if (substring.length > 0) {
                matches = substring.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
                strategy = 'substring'
            }
        }

        const queryTime = Date.now() - startTime
        totalTime += queryTime

        console.log(`  • "${interest}"`)
        console.log(`    Preprocessed: "${processed}"`)

        if (matches.length > 0) {
            totalMatches += matches.length
            console.log(`    ✅ ${matches.length} match(es) via ${strategy} (${queryTime}ms)`)

            for (let i = 0; i < Math.min(3, matches.length); i++) {
                const match = matches[i]
                const concept = concepts.find((c: any) => c.key === match.conceptKey)
                if (concept) {
                    console.log(`       ${i + 1}. [Depth ${concept.depth}] ${concept.label}`)
                    console.log(`          Key: ${concept.key}`)
                    console.log(`          Matched: "${match.matchedAlias}"`)

                    if (!lecturerMatches.has(concept.key)) {
                        lecturerMatches.set(concept.key, {
                            concept,
                            queries: [],
                            matchedAliases: [],
                            scores: []
                        })
                    }
                    const entry = lecturerMatches.get(concept.key)!
                    entry.queries.push(interest)
                    entry.matchedAliases.push(match.matchedAlias)
                    entry.scores.push(1.0)
                }
            }
        } else {
            console.log(`    ❌ No match (${queryTime}ms)`)
        }
    }

    // Summary for this lecturer
    console.log('\n📊 LECTURER SUMMARY:')
    console.log(`  Total interests: ${allInterests.length}`)
    console.log(`  Unique concepts matched: ${lecturerMatches.size}`)

    if (lecturerMatches.size > 0) {
        console.log(`\n  🎯 Matched Concepts:`)
        const sortedMatches = Array.from(lecturerMatches.values()).sort((a, b) => b.queries.length - a.queries.length)

        for (const match of sortedMatches) {
            console.log(`     • ${match.concept.label} (${match.concept.key})`)
            console.log(
                `       Matched ${match.queries.length} time(s): ${match.queries.slice(0, 2).join(', ')}${match.queries.length > 2 ? '...' : ''}`
            )
        }
    }

    console.log()
}

// Overall statistics
console.log('='.repeat(80))
console.log('OVERALL STATISTICS')
console.log('='.repeat(80))
console.log(`Total queries: ${totalQueries}`)
console.log(`Total matches: ${totalMatches}`)
console.log(`Match rate: ${((totalMatches / totalQueries) * 100).toFixed(1)}%`)
console.log(`Total search time: ${totalTime}ms`)
console.log(`Average per query: ${(totalTime / totalQueries).toFixed(2)}ms`)
console.log()

// Collect all unique concepts across all lecturers
const allUniqueConcepts = new Set<string>()
for (const lecturer of lecturers) {
    const allInterests = [...lecturer.areaInterest, ...lecturer.researchInterests]
    for (const interest of allInterests) {
        const processed = preprocessText(interest)
        let matches = trie.searchExact(processed)

        if (matches.length === 0) {
            const fuzzy = trie.searchFuzzyTokens(processed)
            matches = fuzzy.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
        }

        if (matches.length === 0) {
            const substring = trie.searchSubstring(processed)
            matches = substring.map((m) => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
        }

        matches.forEach((m) => allUniqueConcepts.add(m.conceptKey))
    }
}

console.log(`Unique concepts across all lecturers: ${allUniqueConcepts.size}`)

// Show distribution by depth
const depthDistribution = new Map<number, number>()
for (const key of allUniqueConcepts) {
    const concept = concepts.find((c: any) => c.key === key)
    if (concept) {
        depthDistribution.set(concept.depth, (depthDistribution.get(concept.depth) || 0) + 1)
    }
}

console.log('\nConcepts by depth:')
for (const [depth, count] of Array.from(depthDistribution.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  Depth ${depth}: ${count} concepts`)
}

console.log()
console.log('='.repeat(80))
console.log('TEST COMPLETED')
console.log('='.repeat(80))
