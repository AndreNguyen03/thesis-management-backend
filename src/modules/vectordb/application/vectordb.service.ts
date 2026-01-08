import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { QdrantClient } from '@qdrant/js-client-rest'

@Injectable()
export class VectordbService implements OnModuleInit {
    client: QdrantClient
    private readonly logger = new Logger(VectordbService.name)
    
    async onModuleInit() {
        try {
            this.logger.log('Initializing Qdrant client...')

            this.client = new QdrantClient({
                url: process.env.QDRANT_URL || 'http://localhost:6333'
            })

            await this.ensureCollections()

            this.logger.log('Qdrant initialized successfully')
        } catch (error) {
            this.logger.error('Failed to initialize Qdrant', error instanceof Error ? error.stack : String(error))
            throw error // ❗ rất quan trọng
        }
    }

    private async ensureCollections() {
        try {
            const { collections } = await this.client.getCollections()
            const existing = collections.map((c) => c.name)

            const required = ['lecturers', 'topics', 'process_docs']

            for (const name of required) {
                if (!existing.includes(name)) {
                    await this.createCollection(name)
                } else {
                    this.logger.log(`Collection "${name}" already exists`)
                }
            }
        } catch (error) {
            this.logger.error('Error while ensuring collections', error instanceof Error ? error.stack : String(error))
            throw error
        }
    }

    private async createCollection(name: string) {
        try {
            this.logger.log(`Creating collection "${name}"...`)

            await this.client.createCollection(name, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                }
            })

            this.logger.log(`Collection "${name}" created`)
        } catch (error) {
            this.logger.error(
                `Failed to create collection "${name}"`,
                error instanceof Error ? error.stack : String(error)
            )
            throw error
        }
    }

    async upsert(collection: string, points: any[]) {
        try {
            this.logger.debug(`Upserting ${points.length} points into "${collection}"`)

            await this.client.upsert(collection, {
                points
            })
        } catch (error) {
            this.logger.error(
                `Upsert failed for collection "${collection}"`,
                error instanceof Error ? error.stack : String(error)
            )
            throw error
        }
    }

    async search(collection: string, vector: number[], limit = 5, filter?: any) {
        try {
            this.logger.debug(`Searching in "${collection}", limit=${limit}`)

            return await this.client.search(collection, {
                vector,
                limit,
                filter
            })
        } catch (error) {
            this.logger.error(
                `Search failed for collection "${collection}"`,
                error instanceof Error ? error.stack : String(error)
            )
            throw error
        }
    }

    async updatePayload(collection: string, pointId: string, payload: any) {
        try {
            this.logger.debug(`Updating payload for point ${pointId} in "${collection}"`)
            await this.client.setPayload(collection, {
                payload: payload,
                points: [pointId]
            })
        } catch (error) {
            this.logger.error(
                `Update payload failed for point ${pointId} in collection "${collection}"`,
                error instanceof Error ? error.stack : String(error)
            )
            throw error
        }
    }
}
