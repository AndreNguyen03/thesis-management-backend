/**
 * Test script for lecturer concept matching
 * Tests full-text search and alias matching with preprocessing
 * Uses ontology-concepts.json as source
 */

import * as fs from 'fs'
import * as path from 'path'
import { preprocessText, normalizeText, removeStopwords } from './src/modules/matching/utils/text-processor.util'

// Lecturer data
const lecturerData = {
    areaInterest: [
        'Cloud Computing (Điện toán đám mây)',
        'Digital Transformation (Chuyển đổi số)',
        'Software Engineering (Công nghệ phần mềm)',
        'Large-scale Computing (Hệ thống lớn)',
        'Smart Application Development (Phát triển ứng dụng thông minh)'
    ],
    researchInterests: ['Artificial Intelligence (AI)', 'Data Science', 'Big Data', 'Large Language Model']
}

// Load concepts from ontology JSON
const ontologyPath = path.join(__dirname, 'src', 'scripts', 'ontology-concepts.json')
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'))

interface Concept {
    key: string
    label: string
    aliases: string[]
    depth: number
}

const allConcepts: Concept[] = ontologyData

console.log('='.repeat(80))
console.log('LECTURER CONCEPT MATCHING TEST')
console.log(`Loaded ${allConcepts.length} concepts from ontology`)
console.log('='.repeat(80))
console.log()

// Test text preprocessing
console.log('1. TEXT PREPROCESSING TEST')
console.log('-'.repeat(80))
const allInterests = [...lecturerData.areaInterest, ...lecturerData.researchInterests]

allInterests.forEach((interest, idx) => {
    console.log(`\nInput ${idx + 1}: "${interest}"`)
    console.log(`  Step 1 (normalize):     "${normalizeText(interest)}"`)
    console.log(`  Step 2 (remove stopwords): "${preprocessText(interest)}"`)
})

console.log('\n\n2. ALIAS MATCHING TEST')
console.log('-'.repeat(80))

function findAliasMatches(text: string, concepts: Concept[]) {
    const processed = preprocessText(text)
    const tokens = processed.split(' ').filter((t) => t.length > 0)

    const matches: Array<{ concept: Concept; matchedAlias: string; score: number }> = []

    for (const concept of concepts) {
        for (const alias of concept.aliases) {
            const processedAlias = preprocessText(alias)

            // Check if processed text contains the alias or vice versa
            if (processed === processedAlias) {
                matches.push({ concept, matchedAlias: alias, score: 1.0 })
            } else if (processed.includes(processedAlias) || processedAlias.includes(processed)) {
                const similarity =
                    Math.min(processed.length, processedAlias.length) /
                    Math.max(processed.length, processedAlias.length)
                if (similarity > 0.7) {
                    matches.push({ concept, matchedAlias: alias, score: similarity })
                }
            }

            // Check for token overlap
            const aliasTokens = processedAlias.split(' ').filter((t) => t.length > 0)
            const commonTokens = tokens.filter((t) => aliasTokens.includes(t))
            if (commonTokens.length > 0) {
                const tokenScore = commonTokens.length / Math.max(tokens.length, aliasTokens.length)
                if (tokenScore > 0.6 && !matches.find((m) => m.concept.key === concept.key)) {
                    matches.push({ concept, matchedAlias: alias, score: tokenScore })
                }
            }
        }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score)
}

allInterests.forEach((interest) => {
    console.log(`\n📝 Input: "${interest}"`)
    console.log(`   Preprocessed: "${preprocessText(interest)}"`)

    const matches = findAliasMatches(interest, allConcepts)

    if (matches.length > 0) {
        console.log(`   ✅ Found ${matches.length} match(es):`)
        matches.forEach((match, idx) => {
            console.log(`      ${idx + 1}. ${match.concept.label} (${match.concept.key})`)
            console.log(`         Matched via alias: "${match.matchedAlias}"`)
            console.log(`         Score: ${(match.score * 100).toFixed(1)}%`)
        })
    } else {
        console.log('   ❌ No matches found')
    }
})

console.log('\n\n3. SUMMARY')
console.log('-'.repeat(80))
console.log(`Total interests to match: ${allInterests.length}`)

let totalMatches = 0
const matchedConcepts = new Set<string>()
allInterests.forEach((interest) => {
    const matches = findAliasMatches(interest, allConcepts)
    totalMatches += matches.length
    matches.forEach((m) => matchedConcepts.add(m.concept.key))
})

console.log(`Total matches found: ${totalMatches}`)
console.log(`Unique concepts matched: ${matchedConcepts.size}`)
console.log(`Average matches per interest: ${(totalMatches / allInterests.length).toFixed(2)}`)

// Show all unique matched concepts
console.log('\n4. MATCHED CONCEPTS LIST')
console.log('-'.repeat(80))
const uniqueMatches = Array.from(matchedConcepts)
    .map((key) => allConcepts.find((c) => c.key === key))
    .sort((a, b) => a!.depth - b!.depth)

uniqueMatches.forEach((concept, idx) => {
    console.log(`${idx + 1}. [Depth ${concept!.depth}] ${concept!.label}`)
    console.log(`   Key: ${concept!.key}`)
})

console.log('\n' + '='.repeat(80))
console.log('TEST COMPLETED')
console.log('='.repeat(80))
