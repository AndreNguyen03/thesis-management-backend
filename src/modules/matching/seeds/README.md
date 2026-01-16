# Scripts for Concept Inference Module

Add these scripts to your `package.json` for easy management:

```json
{
    "scripts": {
        "seed:concepts": "ts-node src/modules/matching/seeds/sample-concepts.seed.ts",
        "seed:concepts:prod": "node dist/modules/matching/seeds/sample-concepts.seed.js"
    }
}
```

## Usage

### Development

```bash
# Seed sample concepts into database
npm run seed:concepts
```

### Production

```bash
# Build first
npm run build

# Then seed
npm run seed:concepts:prod
```

## Manual Seeding (MongoDB Shell)

If you prefer to use MongoDB shell directly:

```javascript
// Connect to your database
use thesis_management

// Clear existing concepts (optional)
db.concepts.deleteMany({})

// Insert sample concepts
db.concepts.insertMany([
  {
    key: 'cs.ai.machine_learning',
    label: 'Machine Learning',
    aliases: ['ML', 'machine learning', 'máy học'],
    depth: 3,
    embedding: []
  },
  {
    key: 'cs.ai.nlp',
    label: 'Natural Language Processing',
    aliases: ['NLP', 'natural language processing', 'xử lý ngôn ngữ tự nhiên'],
    depth: 3,
    embedding: []
  }
  // ... add more as needed
])

// Verify
db.concepts.countDocuments()
db.concepts.find().limit(5)
```

## Testing the API

After seeding, test the API:

```bash
# 1. Create or find a test student with skills/interests
curl -X GET http://localhost:3000/users/students/YOUR_STUDENT_ID

# 2. Infer concepts
curl -X POST http://localhost:3000/matching/concepts/infer-student \
  -H "Content-Type: application/json" \
  -d '{"studentId": "YOUR_STUDENT_ID"}'
```

## Example Test Student

Create a test student with these skills:

```json
{
    "skills": ["Machine Learning", "Python", "Deep Learning", "MongoDB"],
    "interests": ["Artificial Intelligence", "Natural Language Processing", "Data Science"]
}
```

Expected matches:

- Machine Learning → cs.ai.machine_learning
- Python → programming.python
- Deep Learning → cs.ai.deep_learning
- MongoDB → cs.databases.nosql
- Artificial Intelligence → cs.ai
- Natural Language Processing → cs.ai.nlp
- Data Science → datascience
