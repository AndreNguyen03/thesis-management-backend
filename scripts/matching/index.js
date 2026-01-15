/**
 * Student-Lecturer Matching System
 * Main Entry Point
 */

// Core Modules
const textNormalizer = require('./matching/text-normalizer')
const conceptIndexer = require('./matching/concept-indexer')
const conceptMapper = require('./matching/concept-mapper')
const matchingEngine = require('./matching/matching-engine')
const matchExplainer = require('./matching/match-explainer')
const conceptEvolution = require('./matching/concept-evolution')

/**
 * QUICK START EXAMPLE
 */
async function example() {
    const fs = require('fs')
    const path = require('path')

    // 1. Load data
    const concepts = JSON.parse(fs.readFileSync(path.join(__dirname, 'concepts-export.json'), 'utf-8'))
    const lecturers = JSON.parse(fs.readFileSync(path.join(__dirname, 'lecturers-export.json'), 'utf-8'))

    // 2. Build index
    const conceptIndex = conceptIndexer.buildConceptIndex(concepts)

    // 3. Ingest lecturers
    lecturers.forEach((lecturer) => {
        const result = conceptMapper.extractLecturerConcepts(lecturer, conceptIndex)
        lecturer.concepts = result.concepts
    })

    // 4. Create student
    const student = {
        skills: ['Machine Learning', 'Deep Learning', 'Python'],
        interests: ['AI', 'Data Science']
    }

    // 5. Extract student concepts
    const studentResult = conceptMapper.extractStudentConcepts(student, conceptIndex)

    // 6. Match
    const matches = matchingEngine.matchStudentWithLecturers(studentResult.concepts, lecturers, conceptIndex)

    // 7. Rank
    const topMatches = matchingEngine.rankMatches(matches, { topN: 5 })

    // 8. Explain
    const explained = await matchExplainer.explainMatches(topMatches, student, lecturers)

    // 9. Display
    explained.forEach((match) => {
        console.log(matchExplainer.formatExplanation(match.explanation))
    })
}

module.exports = {
    // Modules
    textNormalizer,
    conceptIndexer,
    conceptMapper,
    matchingEngine,
    matchExplainer,
    conceptEvolution,

    // Example
    example
}
