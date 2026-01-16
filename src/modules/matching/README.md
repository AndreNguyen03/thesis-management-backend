# Ontology-Based Lecturer-Student Matching System

## Overview

Complete ontology-based matching system với offline preprocessing (concept extraction, embedding generation) và online retrieval (vector search + ontology re-ranking).

## Architecture

### Flow

1. **Seed ontology.json** → concepts collection
2. **Sync concepts** → KnowledgeSource (type=CONCEPT) + KnowledgeChunk với embeddings (768-dim Gemini)
3. **Profile updates** trigger concept extraction + embedding generation
4. **Online matching**: student embedding → vector search KnowledgeChunk → join KnowledgeSource → ontology re-ranking

### Data Model

```
KnowledgeSource (metadata + type)
    ├─ type: CONCEPT
    │  ├─ name: concept.label
    │  ├─ source_location: concept.key
    │  └─ metadata: { conceptKey, depth, aliases, keywords }
    │
    └─ type: LECTURER_PROFILE
       ├─ name: lecturer.fullName
       ├─ source_location: lecturerId
       └─ metadata: { lecturerId, email, phone, faculty, ontology_extract }

KnowledgeChunk (text + embedding only)
    ├─ source_id → KnowledgeSource._id
    ├─ text: embedding text
    └─ plot_embedding_gemini_large: [768 dims]
```

### Embedding Strategy

- **Concepts**: `[...aliases, ...keywords].join(', ')` → 768-dim embedding → KnowledgeChunk
- **Lecturers**: Top-5 extracted concepts → `[...aliases, ...keywords].join(', ')` → embedding → KnowledgeChunk
- **Students**: Top-5 extracted concepts → `[...aliases, ...keywords].join(', ')` → embedding → stored in schema

## APIs

### 1. Seed Concepts from Ontology

```http
POST /concepts/seed
```

Seeds ontology.json into concepts collection.

**Response:**

```json
{
    "synced": 232,
    "message": "Successfully seeded 232 concepts (200 new, 32 updated)"
}
```

---

### 2. Sync Concepts to Knowledge Chunks

```http
POST /concepts/sync-to-knowledge
```

Generates embeddings for all concepts and syncs to knowledge_chunks collection.

**Response:**

```json
{
    "synced": 232,
    "message": "Successfully synced 232 concepts to knowledge chunks"
}
```

**Note:** Processes in batches of 10 to avoid rate limiting.

---

### 3. Compute Student Ontology

```http
POST /students/:id/compute-ontology
```

Extracts concepts from student's skills and interests, then generates embedding.

**No request body required** - Service automatically retrieves student.skills and student.interests from database.

**Response:**

```json
{
  "ontology_extract": [
    {
      "conceptKey": "ai_data_science.artificial_intelligence.machine_learning",
      "label": "Machine Learning",
      "score": 0.92
    },
    {
      "conceptKey": "ai_data_science.artificial_intelligence.deep_learning",
      "label": "Deep Learning",
      "score": 0.89
    }
  ],
  "embedding": [0.123, 0.456, ...] // 768 dimensions
}
```

**Updates:**

- `students.ontology_extract`
- `students.embedding`

---

### 4. Sync Lecturer Ontology

```http
POST /lecturers/:id/sync-ontology
```

Extracts concepts from lecturer's areaInterest + researchInterests and creates knowledge_chunk.

**Response:**

```json
{
    "ontology_extract": [
        {
            "conceptKey": "ai_data_science.artificial_intelligence.neural_networks",
            "label": "Neural Networks",
            "score": 0.95
        }
    ],
    "chunkId": "507f1f77bcf86cd799439011"
}
```

**Updates:**

- `lecturers.lecturer_ontology_extract`
- Creates/updates `knowledge_chunks` với type="lecturer-profile"

---

### 5. Find Matching Lecturers

```http
POST /matching/find-lecturers
```

Finds top-K matching lecturers for a student using vector search + ontology re-ranking.

**Request Body:**

```json
{
    "studentId": "507f1f77bcf86cd799439011",
    "topK": 10
}
```

**Response:**

```json
{
    "results": [
        {
            "lecturerId": "507f191e810c19729de860ea",
            "name": "Dr. Nguyen Van A",
            "faculty": "Computer Science",
            "description": "Research interests in AI and ML",
            "phone": "+84912345678",
            "email": "nguyenvana@university.edu",
            "matchedConcepts": [
                {
                    "conceptKey": "ai_data_science.artificial_intelligence.machine_learning",
                    "label": "Machine Learning",
                    "studentScore": 0.92,
                    "lecturerScore": 0.95,
                    "depth": 2
                }
            ],
            "overlapScore": 0.87,
            "vectorScore": 0.82
        }
    ],
    "totalMatched": 10
}
```

**Algorithm:**

1. Load student embedding from schema
2. Vector search knowledge_chunks (type="lecturer-profile") → top-K candidates
3. For each candidate:
    - Calculate overlap score: `Σ(student_score × lecturer_score × (1 + depth × 0.3)) / sqrt(student_total × lecturer_total)`
4. Re-rank by overlap score (descending)

---

## Batch Processing Scripts

### Sync All Lecturers

```bash
npx ts-node scripts/batch-sync-lecturers.ts
```

Processes all existing lecturers with rate limiting (100ms delay between requests).

### Compute All Students

```bash
npx ts-node scripts/batch-compute-students.ts
```

Processes all students with interests/skills. Skips students without data.

---

## Schemas

### Concept

```typescript
{
  key: string              // Unique concept key
  label: string            // Human-readable label
  aliases: string[]        // Aliases for matching
  depth: number            // Hierarchy depth
  keywords: string[]       // Related keywords
  embedding?: number[]     // 768-dim embedding (optional, also stored in KnowledgeChunk)
}
```

### KnowledgeSource

```typescript
{
    name: string // Concept label or lecturer name
    description: string // Description
    source_type: SourceType // 'CONCEPT' | 'LECTURER_PROFILE'
    source_location: string // Concept key or lecturerId
    status: KnowledgeStatus // ENABLED | DISABLED
    processing_status: ProcessingStatus // COMPLETED | PENDING | FAILED
    owner: string // User ID or system
    metadata: Record<string, any> // Flexible metadata
}
```

### KnowledgeChunk

```typescript
{
  source_id: string              // Link to KnowledgeSource._id
  text: string                   // Embedding text
  plot_embedding_gemini_large: number[]  // 768-dim embedding
}
```

### score: number

}]
}

````

### KnowledgeChunk (Lecturer Profile)
```typescript
{
  knowledge_source_type: 'lecturer-profile'
  type: 'lecturer-profile'
  content: string          // Joined aliases + keywords
  embedding: number[]      // 768-dim
  metadata: {
    lecturerId: string
    name: string
    email: string
    phone: string
    faculty: string
    areaInterest: string[]
    researchInterests: string[]
    ontology_extract: [...]
  }
}
````

---

## Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_api_key
```

### Vector Index (MongoDB Atlas)

```javascript
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [{
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }]
  }
}
```

---

## Usage Example

### Initial Setup

```bash
# 1. Seed ontology
curl -X POST http://localhost:3000/concepts/seed

# 2. Sync concepts to knowledge chunks
curl -X POST http://localhost:3000/concepts/sync-to-knowledge

# 3. Batch sync existing data
npx ts-node scripts/batch-sync-lecturers.ts
npx ts-node scripts/batch-compute-students.ts
```

### Student Profile Update

```bash
# When student updates profile (automatically uses student.skills + student.interests)
curl -X POST http://localhost:3000/students/{studentId}/compute-ontology
```

### Lecturer Profile Update

```bash
# When lecturer updates profile
curl -X POST http://localhost:3000/lecturers/{lecturerId}/sync-ontology
```

### Find Matches

```bash
# Find matching lecturers for student
curl -X POST http://localhost:3000/matching/find-lecturers \
  -H "Content-Type: application/json" \
  -d '{"studentId": "507f1f77bcf86cd799439011", "topK": 10}'
```

---

## Performance

- **Concept seeding**: ~2s for 232 concepts
- **Concept sync**: ~5-10s for 232 concepts (10 concurrent requests)
- **Student compute**: ~500ms (vector search + embedding generation)
- **Lecturer sync**: ~600ms (vector search + embedding + knowledge chunk update)
- **Matching**: ~300-500ms (vector search + re-ranking for 10 results)

---

## Notes

- **Top-K Configuration**: Currently hardcoded (top-5 concepts, top-10 lecturers). Can be made configurable via env vars.
- **Depth Weighting**: Alpha = 0.3 for `(1 + depth × α)`. Can be tuned based on testing.
- **Rate Limiting**: Batch scripts use 100ms delay to avoid rate limiting Gemini API.
- **Error Handling**: All services include comprehensive error logging and validation.
