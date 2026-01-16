/**
 * Performance comparison: Sequential scan vs Trie index
 */

import * as fs from 'fs'
import * as path from 'path'
import { preprocessText } from './src/modules/matching/utils/text-processor.util'
import { TrieIndex, buildTrieIndex } from './src/modules/matching/utils/trie-index.util'

// Load ontology
const ontologyPath = path.join(__dirname, 'src', 'scripts', 'ontology-concepts.json')
const concepts = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'))

// Test data (lecturer interests)
const testQueries = [
    "Cloud Computing (Điện toán đám mây)",
    "Digital Transformation (Chuyển đổi số)",
    "Software Engineering (Công nghệ phần mềm)",
    "Large-scale Computing (Hệ thống lớn)",
    "Smart Application Development (Phát triển ứng dụng thông minh)",
    "Artificial Intelligence (AI)",
    "Data Science",
    "Big Data",
    "Large Language Model",
    "Machine Learning",
    "Deep Learning",
    "Neural Networks",
    "Computer Vision",
    "Natural Language Processing",
    "Blockchain Technology",
    "Internet of Things",
    "Quantum Computing",
    "Cybersecurity",
    "Game Development",
    "Virtual Reality"
]

console.log('='.repeat(80))
console.log('TRIE INDEX PERFORMANCE TEST')
console.log('='.repeat(80))
console.log(`Ontology size: ${concepts.length} concepts`)
console.log(`Test queries: ${testQueries.length}`)
console.log('='.repeat(80))
console.log()

// Method 1: Sequential scan (O(n*m))
function sequentialScan(query: string, concepts: any[]): Array<{key: string, alias: string, score: number}> {
    const processed = preprocessText(query)
    const tokens = processed.split(' ').filter(t => t.length > 0)
    const matches: Array<{key: string, alias: string, score: number}> = []

    for (const concept of concepts) {
        for (const alias of concept.aliases) {
            const processedAlias = preprocessText(alias)
            
            // Exact match
            if (processed === processedAlias) {
                matches.push({ key: concept.key, alias, score: 1.0 })
                continue
            }

            // Substring match
            if (processed.includes(processedAlias) || processedAlias.includes(processed)) {
                const similarity = Math.min(processed.length, processedAlias.length) / 
                                  Math.max(processed.length, processedAlias.length)
                if (similarity > 0.7) {
                    matches.push({ key: concept.key, alias, score: similarity })
                }
            }

            // Token overlap
            const aliasTokens = processedAlias.split(' ').filter(t => t.length > 0)
            const commonTokens = tokens.filter(t => aliasTokens.includes(t))
            if (commonTokens.length > 0) {
                const tokenScore = commonTokens.length / Math.max(tokens.length, aliasTokens.length)
                if (tokenScore > 0.6 && !matches.find(m => m.key === concept.key)) {
                    matches.push({ key: concept.key, alias, score: tokenScore })
                }
            }
        }
    }

    return matches.sort((a, b) => b.score - a.score)
}

// Method 2: Trie index (O(n*L))
console.log('Building Trie index...')
const trieStartTime = Date.now()
const trie = buildTrieIndex(concepts, preprocessText)
const trieBuildTime = Date.now() - trieStartTime
const stats = trie.getStats()
console.log(`✅ Trie built in ${trieBuildTime}ms`)
console.log(`   Nodes: ${stats.totalNodes}`)
console.log(`   Concepts: ${stats.totalConcepts}`)
console.log()

// Test sequential scan
console.log('1. SEQUENTIAL SCAN METHOD')
console.log('-'.repeat(80))
const seqStartTime = Date.now()
const seqResults: Array<{query: string, matches: number}> = []

for (const query of testQueries) {
    const matches = sequentialScan(query, concepts)
    seqResults.push({ query, matches: matches.length })
}

const seqTotalTime = Date.now() - seqStartTime
const seqAvgTime = seqTotalTime / testQueries.length

console.log(`Total time: ${seqTotalTime}ms`)
console.log(`Average per query: ${seqAvgTime.toFixed(2)}ms`)
console.log(`Total matches: ${seqResults.reduce((sum, r) => sum + r.matches, 0)}`)
console.log()

// Test Trie index
console.log('2. TRIE INDEX METHOD')
console.log('-'.repeat(80))
const trieSearchStartTime = Date.now()
const trieResults: Array<{query: string, matches: number}> = []

for (const query of testQueries) {
    const processed = preprocessText(query)
    
    // Try exact match
    let matches = trie.searchExact(processed)
    
    // Try fuzzy if no exact match
    if (matches.length === 0) {
        const fuzzy = trie.searchFuzzyTokens(processed)
        matches = fuzzy.map(m => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
    }
    
    // Try substring if still no match
    if (matches.length === 0) {
        const substring = trie.searchSubstring(processed)
        matches = substring.map(m => ({ conceptKey: m.conceptKey, matchedAlias: m.matchedAlias }))
    }
    
    trieResults.push({ query, matches: matches.length })
}

const trieTotalTime = Date.now() - trieSearchStartTime
const trieAvgTime = trieTotalTime / testQueries.length

console.log(`Total time: ${trieTotalTime}ms`)
console.log(`Average per query: ${trieAvgTime.toFixed(2)}ms`)
console.log(`Total matches: ${trieResults.reduce((sum, r) => sum + r.matches, 0)}`)
console.log()

// Comparison
console.log('3. PERFORMANCE COMPARISON')
console.log('-'.repeat(80))
const speedup = seqTotalTime / trieTotalTime
const speedupPercent = ((seqTotalTime - trieTotalTime) / seqTotalTime * 100)

console.log(`Sequential scan:  ${seqTotalTime}ms (avg ${seqAvgTime.toFixed(2)}ms/query)`)
console.log(`Trie index:       ${trieTotalTime}ms (avg ${trieAvgTime.toFixed(2)}ms/query)`)
console.log(`Speedup:          ${speedup.toFixed(2)}x faster (${speedupPercent.toFixed(1)}% improvement)`)
console.log()

console.log(`Trie build time:  ${trieBuildTime}ms (one-time cost)`)
console.log(`Break-even point: ~${Math.ceil(trieBuildTime / (seqAvgTime - trieAvgTime))} queries`)
console.log()

// Complexity analysis
const n = testQueries.length
const m = concepts.length
const avgAliases = concepts.reduce((sum: number, c: any) => sum + c.aliases.length, 0) / m
const avgTextLength = 20 // average characters

console.log('4. COMPLEXITY ANALYSIS')
console.log('-'.repeat(80))
console.log(`n (queries):           ${n}`)
console.log(`m (concepts):          ${m}`)
console.log(`avg aliases/concept:   ${avgAliases.toFixed(1)}`)
console.log(`avg text length:       ${avgTextLength} chars`)
console.log()
console.log(`Sequential: O(n × m × aliases) = O(${n} × ${m} × ${avgAliases.toFixed(0)}) = ~${(n * m * avgAliases).toFixed(0)} operations`)
console.log(`Trie index: O(n × L) = O(${n} × ${avgTextLength}) = ~${n * avgTextLength} operations`)
console.log(`Theoretical speedup: ${((n * m * avgAliases) / (n * avgTextLength)).toFixed(1)}x`)
console.log()

// Detailed results comparison
console.log('5. DETAILED RESULTS')
console.log('-'.repeat(80))
console.log('Query                                    | Seq | Trie | Match')
console.log('-'.repeat(80))

for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i].padEnd(40)
    const seq = seqResults[i].matches.toString().padStart(3)
    const trie = trieResults[i].matches.toString().padStart(4)
    const match = seqResults[i].matches === trieResults[i].matches ? '✅' : '❌'
    console.log(`${query} | ${seq} | ${trie} | ${match}`)
}

console.log()
console.log('='.repeat(80))
console.log('TEST COMPLETED')
console.log('='.repeat(80))
