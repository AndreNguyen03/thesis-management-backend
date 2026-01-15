# Student-Lecturer Matching System

Hệ thống matching sinh viên - giảng viên dựa trên ontology concepts, implement theo chiến lược 3-pipeline.

## 🏗️ Kiến Trúc

```
┌─────────────────────────────────────────────────────────┐
│                   PIPELINE 1: INGEST                    │
│  Text → Normalize → Concept Mapping → Depth Filter     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   PIPELINE 2: MATCH                     │
│  Leaf Overlap → Weighted Score → Parent Boost → Rank   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 PIPELINE 3: EVOLUTION                   │
│  Unknown Text → Concept Candidate → Approve → Re-ingest│
└─────────────────────────────────────────────────────────┘
```

## 📁 Cấu Trúc Thư Mục

```
scripts/
├── matching/
│   ├── text-normalizer.js      # Pipeline 1, Step 1: Chuẩn hóa text
│   ├── concept-indexer.js      # Pipeline 1, Step 2: Build index
│   ├── concept-mapper.js       # Pipeline 1, Step 2-3: Map text → concepts
│   ├── matching-engine.js      # Pipeline 2: Core matching logic
│   ├── match-explainer.js      # Pipeline 2, Step 9: Explain matches
│   └── concept-evolution.js    # Pipeline 3: Handle new concepts
│
├── ingest-lecturer-concepts.js # Script: Ingest lecturers to DB
├── demo-matching.js            # Script: End-to-end demo
├── test-concept-mapping.js     # Script: Test concept mapping
│
├── concepts-export.json        # Data: Concept tree
└── lecturers-export.json       # Data: Lecturers
```

## 🚀 Quick Start

### 1. Test Concept Mapping

Test text normalization và concept extraction:

```bash
cd backend/scripts
node test-concept-mapping.js
```

### 2. Run Complete Demo

Demo đầy đủ từ ingest → match → explain:

```bash
node demo-matching.js
```

### 3. Ingest Lecturers to Database

Xử lý toàn bộ giảng viên và lưu concepts vào DB:

```bash
node ingest-lecturer-concepts.js
```

## 📚 Core Modules

### 1. Text Normalizer (`text-normalizer.js`)

**Chức năng:**

- Chuyển tiếng Việt có dấu → không dấu
- Lowercase, remove punctuation
- Tokenization (giữ nguyên multi-word phrases)
- Synonym expansion

**API:**

```javascript
const { normalize, normalizeAndTokenize, normalizeArray } = require('./matching/text-normalizer')

// Chuẩn hóa text
normalize('Trí tuệ nhân tạo') // → 'tri tue nhan tao'

// Chuẩn hóa + tokenize + expand synonyms
normalizeAndTokenize('Machine Learning & Deep Learning')
// → ['machine learning', 'ml', 'hoc may', 'deep learning', 'dl', ...]

// Xử lý array
normalizeArray(['AI', 'Machine Learning', 'NLP'])
```

### 2. Concept Indexer (`concept-indexer.js`)

**Chức năng:**

- Build index từ concept tree
- Tính depth, role, parent
- Lookup nhanh theo label/alias

**API:**

```javascript
const { buildConceptIndex, findConcepts } = require('./matching/concept-indexer')

// Build index
const conceptIndex = buildConceptIndex(concepts)

// Find concepts
const found = findConcepts('machine learning', conceptIndex)
// → [{ key: 'it.ai.machine-learning', label: 'Machine Learning', depth: 3, ... }]
```

**Depth & Role Rules:**

| Depth | Role           | Used for Match?    |
| ----- | -------------- | ------------------ |
| 1     | root           | ❌ No              |
| 2     | domain         | ❌ No (boost only) |
| ≥3    | specialization | ✅ Yes             |

### 3. Concept Mapper (`concept-mapper.js`)

**Chức năng:**

- Extract concepts từ text (NO LLM)
- Map text → concepts qua label/alias
- Filter by depth ≥ 3
- Track unmatched tokens

**API:**

```javascript
const { extractLecturerConcepts, extractStudentConcepts } = require('./matching/concept-mapper')

// Extract từ lecturer profile
const result = extractLecturerConcepts(lecturer, conceptIndex)
// result = {
//   concepts: [{ key, label, depth, source, ... }],
//   unmatchedTokens: [...],
//   stats: { fromAreaInterest, fromResearchInterests, ... }
// }

// Extract từ student profile
const result = extractStudentConcepts(student, conceptIndex)
```

### 4. Matching Engine (`matching-engine.js`)

**Chức năng:**

- Match sinh viên ↔ giảng viên
- Leaf-level only matching
- Weighted score by depth
- Parent boost (nếu có core match)

**Scoring Rules:**

```javascript
// Core match (exact key)
depth 3 → weight 1.0
depth 4 → weight 1.5
depth 5 → weight 2.0

// Parent boost (chỉ khi có core match)
same parent at depth 2 → +0.3 per pair

// Threshold
totalScore < 1.0 → reject
```

**API:**

```javascript
const { matchStudentWithLecturers, rankMatches } = require('./matching/matching-engine')

// Match student với tất cả lecturers
const matches = matchStudentWithLecturers(studentConcepts, lecturers, conceptIndex, { minDepth: 3, minScore: 1.0 })

// Rank và filter
const topMatches = rankMatches(matches, { topN: 10 })
```

### 5. Match Explainer (`match-explainer.js`)

**Chức năng:**

- Generate explanation cho matches
- Support cả template-based và LLM-based
- Format human-readable

**API:**

```javascript
const { explainMatches, formatExplanation } = require('./matching/match-explainer')

// Generate explanations
const explained = await explainMatches(matches, studentProfile, lecturerProfiles, { useLLM: false })

// Format cho display
console.log(formatExplanation(explained[0].explanation))
```

### 6. Concept Evolution (`concept-evolution.js`)

**Chức năng:**

- Detect unmapped tokens
- Group similar tokens
- Suggest parent concept (LLM optional)
- Build candidate queue

**API:**

```javascript
const { buildConceptCandidateQueue, suggestConceptParent } = require('./matching/concept-evolution')

// Build candidate queue từ unmatched tokens
const candidates = buildConceptCandidateQueue(unmatchedByProfile, conceptIndex)

// Suggest parent cho new concept (LLM optional)
const suggestion = await suggestConceptParent(token, conceptIndex, llmClient)
// → { parent: 'it.ai', label: '...', aliases: [...] }
```

## 🔄 Workflow

### Pipeline 1: Ingest Lecturer

```javascript
// 1. Load concept tree
const concepts = loadConcepts()
const conceptIndex = buildConceptIndex(concepts)

// 2. Extract concepts từ lecturer
const result = extractLecturerConcepts(lecturer, conceptIndex)

// 3. Save to DB
await db.collection('lecturers').updateOne({ _id: lecturer._id }, { $set: { concepts: result.concepts } })
```

### Pipeline 2: Match Student với Lecturers

```javascript
// 1. Extract student concepts
const studentResult = extractStudentConcepts(student, conceptIndex)

// 2. Match với tất cả lecturers
const matches = matchStudentWithLecturers(studentResult.concepts, lecturers, conceptIndex)

// 3. Rank matches
const topMatches = rankMatches(matches, { topN: 5 })

// 4. Explain
const explained = await explainMatches(topMatches, student, lecturers)
```

### Pipeline 3: Handle New Concepts

```javascript
// 1. Collect unmatched tokens từ nhiều profiles
const unmatchedByProfile = [...]

// 2. Build candidate queue
const candidates = buildConceptCandidateQueue(unmatchedByProfile, conceptIndex)

// 3. Review và approve (manual hoặc LLM-assisted)
for (const candidate of candidates) {
    const suggestion = await suggestConceptParent(
        candidate.canonical,
        conceptIndex,
        llmClient
    )

    // 4. Thêm vào concept tree (manual)
    // 5. Re-ingest affected profiles
}
```

## 📊 Output Examples

### Concept Extraction Output

```json
{
    "concepts": [
        {
            "key": "it.ai.machine-learning",
            "label": "Machine Learning",
            "depth": 3,
            "role": "branch",
            "parent": "it.ai",
            "source": "researchInterests",
            "sources": ["researchInterests", "areaInterest"]
        }
    ],
    "unmatchedTokens": ["post quantum cryptography"],
    "stats": {
        "fromAreaInterest": 3,
        "fromResearchInterests": 5,
        "totalUnmatched": 1
    }
}
```

### Match Output

```json
{
    "lecturerId": "6908785b8de51cf12b091b52",
    "lecturerName": "Dr. Nguyen Van A",
    "score": 3.5,
    "coreScore": 3.5,
    "boostScore": 0.0,
    "conceptCount": 2,
    "matchedConcepts": [
        {
            "key": "it.ai.machine-learning",
            "label": "Machine Learning",
            "depth": 3,
            "weight": 1.0,
            "matchType": "exact",
            "studentSources": ["skills"],
            "lecturerSources": ["researchInterests"]
        }
    ]
}
```

### Explanation Output

```
📊 Score: 3.50
📝 Match với 2 concept(s) chung, tổng điểm: 3.50

🎯 Matched Concepts:
  1. Machine Learning
     Cả hai cùng chuyên về Machine Learning
     Sinh viên quan tâm (từ skills), Giảng viên nghiên cứu (từ researchInterests)

  2. Deep Learning
     Cả hai cùng chuyên về Deep Learning
     Sinh viên quan tâm (từ interests), Giảng viên nghiên cứu (từ areaInterest)
```

## ⚙️ Configuration

### Matching Parameters

```javascript
// In matching-engine.js
const MATCH_DEPTH = 3 // Minimum depth cho matching
const MIN_SCORE_THRESHOLD = 1.0 // Minimum score để accept match

const DEPTH_WEIGHTS = {
    3: 1.0,
    4: 1.5,
    5: 2.0,
    6: 2.5
}

const PARENT_BOOST = 0.3 // Boost khi có chung parent
const PARENT_DEPTH_FOR_BOOST = 2 // Depth của parent để boost
```

### Customization

**Thêm synonyms:**

```javascript
// In text-normalizer.js
const SYNONYMS = {
    'your-concept': ['synonym1', 'synonym2']
    // ...
}
```

**Điều chỉnh scoring:**

```javascript
// In matching-engine.js
const DEPTH_WEIGHTS = {
    3: 1.2, // Tăng weight cho depth 3
    4: 2.0
    // ...
}
```

## 🧪 Testing

### Test 1: Concept Mapping

```bash
node test-concept-mapping.js
```

Output:

- Text normalization results
- Concept index stats
- Concept lookup examples
- Lecturer extraction samples

### Test 2: Complete Demo

```bash
node demo-matching.js
```

Output:

- Full pipeline execution
- Top matches với explanations
- Concept evolution candidates
- Summary statistics

## 📝 Database Schema

### Lecturer Document (sau ingest)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  areaInterest: [String],
  researchInterests: [String],

  // Added by ingest
  concepts: [
    {
      key: String,
      label: String,
      depth: Number,
      role: String,
      parent: String,
      source: String,
      sources: [String],
      matchedToken: String,
      matchedText: String
    }
  ],
  conceptStats: {
    fromAreaInterest: Number,
    fromResearchInterests: Number,
    fromPublications: Number,
    totalUnmatched: Number
  },
  conceptsUpdatedAt: Date
}
```

## 🔧 Integration với Backend

### 1. Service Layer

```javascript
// src/modules/matching/matching.service.ts
import { extractStudentConcepts } from '@/scripts/matching/concept-mapper'
import { matchStudentWithLecturers } from '@/scripts/matching/matching-engine'

class MatchingService {
  async findMatchingLecturers(studentId: string) {
    const student = await this.studentRepo.findById(studentId)
    const lecturers = await this.lecturerRepo.findWithConcepts()

    const studentConcepts = extractStudentConcepts(student, this.conceptIndex)
    const matches = matchStudentWithLecturers(studentConcepts, lecturers, this.conceptIndex)

    return rankMatches(matches)
  }
}
```

### 2. API Endpoint

```javascript
// src/modules/matching/matching.controller.ts
@Get('/lecturers/match')
async getMatchingLecturers(@Query('studentId') studentId: string) {
  const matches = await this.matchingService.findMatchingLecturers(studentId)
  return { data: matches }
}
```

### 3. Cron Job (Re-ingest)

```javascript
// src/modules/matching/matching.cron.ts
@Cron('0 2 * * *') // 2 AM daily
async reingestLecturers() {
  await this.matchingService.reingestAllLecturers()
}
```

## 🚀 Deployment Notes

### 1. Initial Setup

```bash
# Export concepts from DB
node scripts/export-concepts.js

# Ingest all lecturers
node scripts/ingest-lecturer-concepts.js
```

### 2. Regular Maintenance

- Re-ingest lecturers when họ update profile
- Review concept candidates weekly
- Update concept tree as needed

### 3. Performance

- Concept index: in-memory (~few MB)
- Matching: O(n\*m) where n=student concepts, m=lecturer count
- Typical: <100ms for 1 student × 100 lecturers

## 📈 Future Enhancements

1. **LLM Integration**
    - Better explanations
    - Concept suggestion
    - Auto-approval workflow

2. **Advanced Matching**
    - Publication similarity
    - Collaboration network
    - Research trend analysis

3. **UI Dashboard**
    - Concept tree visualization
    - Match analytics
    - Candidate review interface

## 📄 License

Internal use only - Thesis Management System

---

**Author:** AI Assistant  
**Date:** January 2026  
**Version:** 1.0.0
