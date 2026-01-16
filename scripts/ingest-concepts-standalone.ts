import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import mongoose from 'mongoose'
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { ConceptSchema } from '../src/modules/matching/schemas/concept.schema'

/* =======================
   ENV LOADING
======================= */
const envPath = path.resolve(process.cwd(), '.env.development')
dotenv.config({ path: fs.existsSync(envPath) ? envPath : undefined })

const GEMINI_API_KEY =
	process.env.GEMINI_API_KEY ||
	process.env.GOOGLE_AI_API_KEY || 'default' 

const MONGO_URI =
	process.env.MONGO_URI ||
	process.env.MONGO_URL || 'default'

const MONGO_DB_NAME =
	process.env.MONGO_DB_NAME ||
	process.env.MONGO_DB ||
	'thesis-db'

if (!GEMINI_API_KEY) {
	console.error('Missing GEMINI_API_KEY')
	process.exit(1)
}

if (!MONGO_URI) {
	console.error('Missing MONGO_URI / MONGO_URL')
	process.exit(1)
}

/* =======================
   HELPERS
======================= */

/**
 * Check whether a MongoDB URI already contains a database name
 * Works for both mongodb:// and mongodb+srv://
 */
function hasDatabaseInUri(uri: string): boolean {
	const withoutQuery = uri.split('?')[0]
	const afterProtocol = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, '')
	const slashIndex = afterProtocol.indexOf('/')

	if (slashIndex === -1) return false
	const dbPart = afterProtocol.slice(slashIndex + 1)

	return Boolean(dbPart && dbPart.length > 0)
}

function buildMongoUri(baseUri: string, dbName: string): string {
	if (hasDatabaseInUri(baseUri)) return baseUri

	const [uriWithoutQuery, query] = baseUri.split('?')
	const normalized = uriWithoutQuery.replace(/\/+$/, '')

	return query
		? `${normalized}/${dbName}?${query}`
		: `${normalized}/${dbName}`
}

function computeDepth(key: string): number {
	if (!key) return 0
	return Math.max(0, key.split('.').filter(Boolean).length - 1)
}

/* =======================
   MAIN
======================= */

async function main() {
	const mongoUri = buildMongoUri(MONGO_URI, MONGO_DB_NAME)

	console.log('Connecting MongoDB:', mongoUri)
	await mongoose.connect(mongoUri)

	const ConceptModel = mongoose.model('Concept', ConceptSchema)

	console.log('Initializing Gemini')
	const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
	const embeddingModel: GenerativeModel =
		genAI.getGenerativeModel({ model: 'text-embedding-004' })

	const DATA_PATH = path.resolve(process.cwd(), 'scripts', 'concept.dedup.json')
	if (!fs.existsSync(DATA_PATH)) {
		console.error('Missing input file:', DATA_PATH)
		process.exit(2)
	}

	const concepts = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))

	let success = 0
	let failed = 0

	for (const c of concepts) {
		const { key, label } = c
		const aliases: string[] = Array.isArray(c.aliases) ? c.aliases : []
		const depth = computeDepth(key)

		try {
			console.log('Processing:', key)

			const text = aliases.join(' ')
			const resp = await embeddingModel.embedContent(text)
			const embedding = resp?.embedding?.values ?? []

			await ConceptModel.updateOne(
				{ key },
				{ $set: { key, label, aliases, depth, embedding } },
				{ upsert: true }
			)

			console.log(`  ✔ Upserted (${embedding.length} dims)`)
			success++
		} catch (err: any) {
			console.error(`  ✖ Failed ${key}:`, err?.message ?? err)
			failed++
		}
	}

	console.log(`Done. success=${success}, failed=${failed}`)
	await mongoose.disconnect()
}

main().catch((err) => {
	console.error('Fatal error:', err)
	process.exit(10)
})
