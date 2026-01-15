/**
 * Complete Demo - End-to-End Test
 * Demonstrates: Ingest → Match → Explain
 */

const fs = require('fs')
const path = require('path')

const { buildConceptIndex } = require('./matching/concept-indexer')
const { extractLecturerConcepts, extractStudentConcepts } = require('./matching/concept-mapper')
const { matchStudentWithLecturers, rankMatches, calculateMatchStats } = require('./matching/matching-engine')
const { explainMatches, formatExplanation } = require('./matching/match-explainer')
const { buildConceptCandidateQueue } = require('./matching/concept-evolution')

async function main() {
    console.log('🎯 Complete Matching Demo\n')
    console.log('='.repeat(60) + '\n')

    // ===== STEP 1: LOAD DATA =====
    console.log('📚 STEP 1: Loading Data...')

    const conceptsPath = path.join(__dirname, 'concepts-export.json')
    const lecturersPath = path.join(__dirname, 'lecturers-export.json')

    const concepts = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'))
    const lecturers = JSON.parse(fs.readFileSync(lecturersPath, 'utf-8'))

    console.log(`   ✅ Loaded ${concepts.length} concepts`)
    console.log(`   ✅ Loaded ${lecturers.length} lecturers\n`)

    // ===== STEP 2: BUILD INDEX =====
    console.log('🔍 STEP 2: Building Concept Index...')
    const conceptIndex = buildConceptIndex(concepts)
    console.log(`   ✅ Indexed ${conceptIndex.byKey.size} concepts`)
    console.log(`   ✅ Label index: ${conceptIndex.byLabel.size} entries`)
    console.log(`   ✅ Alias index: ${conceptIndex.byAlias.size} entries\n`)

    // ===== STEP 3: INGEST LECTURERS =====
    console.log('👨‍🏫 STEP 3: Ingesting Lecturer Concepts...')

    const lecturerStats = {
        total: 0,
        withConcepts: 0,
        totalConcepts: 0
    }

    const unmatchedByProfile = []

    for (const lecturer of lecturers) {
        const result = extractLecturerConcepts(lecturer, conceptIndex)

        lecturer.concepts = result.concepts
        lecturer.conceptStats = result.stats

        lecturerStats.total++
        if (result.concepts.length > 0) {
            lecturerStats.withConcepts++
            lecturerStats.totalConcepts += result.concepts.length
        }

        if (result.unmatchedTokens.length > 0) {
            unmatchedByProfile.push({
                profileId: lecturer._id,
                profileType: 'lecturer',
                source: 'areaInterest+researchInterests',
                unmatchedTokens: result.unmatchedTokens
            })
        }
    }

    console.log(`   ✅ Processed ${lecturerStats.total} lecturers`)
    console.log(`   ✅ ${lecturerStats.withConcepts} have concepts`)
    console.log(`   ✅ Total concepts: ${lecturerStats.totalConcepts}`)
    console.log(`   ✅ Avg per lecturer: ${(lecturerStats.totalConcepts / lecturerStats.withConcepts).toFixed(2)}\n`)

    // ===== STEP 4: CREATE SAMPLE STUDENT =====
    console.log('🎓 STEP 4: Creating Sample Student...')

    const sampleStudent = {
        _id: 'student-001',
        name: 'Nguyen Van A',
        skills: ['Machine Learning', 'Deep Learning', 'Python', 'Natural Language Processing', 'Large Language Models'],
        interests: ['AI for Healthcare', 'Computer Vision', 'Data Science']
    }

    console.log(`   Student: ${sampleStudent.name}`)
    console.log(`   Skills: ${sampleStudent.skills.join(', ')}`)
    console.log(`   Interests: ${sampleStudent.interests.join(', ')}\n`)

    // ===== STEP 5: EXTRACT STUDENT CONCEPTS =====
    console.log('🔍 STEP 5: Extracting Student Concepts...')

    const studentResult = extractStudentConcepts(sampleStudent, conceptIndex)
    sampleStudent.concepts = studentResult.concepts

    console.log(`   ✅ Extracted ${studentResult.concepts.length} concepts`)
    console.log(`   ✅ From skills: ${studentResult.stats.fromSkills}`)
    console.log(`   ✅ From interests: ${studentResult.stats.fromInterests}`)

    if (studentResult.concepts.length > 0) {
        console.log('\n   📋 Student Concepts:')
        studentResult.concepts.forEach((c) => {
            console.log(`      - ${c.label} (${c.key}) [depth: ${c.depth}]`)
        })
    }

    if (studentResult.unmatchedTokens.length > 0) {
        console.log(`\n   ⚠️  Unmatched: ${studentResult.unmatchedTokens.join(', ')}`)

        unmatchedByProfile.push({
            profileId: sampleStudent._id,
            profileType: 'student',
            source: 'skills+interests',
            unmatchedTokens: studentResult.unmatchedTokens
        })
    }

    console.log('')

    // ===== STEP 6: MATCH WITH LECTURERS =====
    console.log('🎯 STEP 6: Matching with Lecturers...')

    const matches = matchStudentWithLecturers(sampleStudent.concepts, lecturers, conceptIndex, {
        minDepth: 3,
        minScore: 1.0,
        enableParentBoost: true
    })

    console.log(`   ✅ Found ${matches.length} potential matches\n`)

    // ===== STEP 7: RANK MATCHES =====
    console.log('📊 STEP 7: Ranking Matches...')

    const topMatches = rankMatches(matches, {
        topN: 5,
        minScore: 1.0,
        minConceptCount: 1
    })

    const stats = calculateMatchStats(topMatches)

    console.log(`   ✅ Top ${topMatches.length} matches`)
    console.log(`   📈 Score range: ${stats.minScore.toFixed(2)} - ${stats.maxScore.toFixed(2)}`)
    console.log(`   📈 Avg score: ${stats.avgScore.toFixed(2)}`)
    console.log(`   📈 Avg concepts: ${stats.avgConceptCount.toFixed(2)}\n`)

    // ===== STEP 8: EXPLAIN MATCHES =====
    console.log('💬 STEP 8: Generating Explanations...')

    const explained = await explainMatches(topMatches, sampleStudent, lecturers, { useLLM: false })

    console.log(`   ✅ Generated ${explained.length} explanations\n`)

    // ===== STEP 9: DISPLAY RESULTS =====
    console.log('='.repeat(60))
    console.log('🏆 TOP MATCHES')
    console.log('='.repeat(60) + '\n')

    explained.forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.lecturerName} (${match.lecturerTitle})`)
        console.log(`   Faculty ID: ${match.faculty}`)
        console.log('-'.repeat(60))
        console.log(formatExplanation(match.explanation))
        console.log('')
    })

    // ===== STEP 10: CONCEPT EVOLUTION =====
    console.log('='.repeat(60))
    console.log('🌱 CONCEPT EVOLUTION - New Concept Candidates')
    console.log('='.repeat(60) + '\n')

    if (unmatchedByProfile.length > 0) {
        const candidates = buildConceptCandidateQueue(unmatchedByProfile, conceptIndex)

        console.log(`Found ${candidates.length} concept candidates:\n`)

        candidates.slice(0, 10).forEach((candidate, idx) => {
            console.log(`${idx + 1}. "${candidate.canonical}"`)
            console.log(`   Frequency: ${candidate.frequency}`)
            console.log(`   Variants: ${candidate.variants.join(', ')}`)
            console.log(`   Examples: ${candidate.examples.length} profiles`)
            console.log('')
        })

        // Save to file
        const candidatesPath = path.join(__dirname, 'concept-candidates.json')
        fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2), 'utf-8')
        console.log(`📁 Full candidates list saved to: ${candidatesPath}\n`)
    } else {
        console.log('✅ No unmatched tokens - all concepts mapped!\n')
    }

    // ===== SUMMARY =====
    console.log('='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Lecturers processed: ${lecturerStats.total}`)
    console.log(`✅ Lecturers with concepts: ${lecturerStats.withConcepts}`)
    console.log(`✅ Student concepts extracted: ${studentResult.concepts.length}`)
    console.log(`✅ Matches found: ${matches.length}`)
    console.log(`✅ Top matches: ${topMatches.length}`)
    console.log(
        `✅ Concept candidates: ${unmatchedByProfile.length > 0 ? buildConceptCandidateQueue(unmatchedByProfile, conceptIndex).length : 0}`
    )
    console.log('\n✅ Demo completed successfully!')
}

main().catch((err) => {
    console.error('❌ Demo failed:', err)
    process.exit(1)
})
