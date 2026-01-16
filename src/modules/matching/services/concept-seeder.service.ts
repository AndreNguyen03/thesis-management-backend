import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Concept } from '../schemas/concept.schema'
import * as fs from 'fs/promises'
import * as path from 'path'

@Injectable()
export class ConceptSeederService {
    private readonly logger = new Logger(ConceptSeederService.name)

    constructor(@InjectModel(Concept.name) private conceptModel: Model<Concept>) {}

    async seedFromOntologyJson(): Promise<{ synced: number; message: string }> {
        try {
            const ontologyPath = path.join(process.cwd(), 'scripts', 'ontology.json')
            this.logger.log(`Reading ontology from: ${ontologyPath}`)

            const fileContent = await fs.readFile(ontologyPath, 'utf-8')
            const ontologyData = JSON.parse(fileContent)

            if (!Array.isArray(ontologyData)) {
                throw new Error('Ontology data must be an array')
            }

            this.logger.log(`Found ${ontologyData.length} concepts in ontology.json`)

            // Prepare bulk operations
            const bulkOps = ontologyData.map((item) => ({
                updateOne: {
                    filter: { key: item.key },
                    update: {
                        $set: {
                            key: item.key,
                            label: item.label,
                            aliases: item.aliases || [],
                            depth: item.depth || 0,
                            keywords: item.keywords || []
                        }
                    },
                    upsert: true
                }
            }))

            // Execute bulk operation
            const result = await this.conceptModel.bulkWrite(bulkOps)

            const synced = result.upsertedCount + result.modifiedCount

            this.logger.log(`Seeding completed: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`)

            return {
                synced,
                message: `Successfully seeded ${synced} concepts (${result.upsertedCount} new, ${result.modifiedCount} updated)`
            }
        } catch (error) {
            this.logger.error(`Failed to seed concepts: ${error.message}`, error.stack)
            throw error
        }
    }
}
