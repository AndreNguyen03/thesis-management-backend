import { Controller, Post, Param, Body, Logger } from '@nestjs/common'
import { ConceptSeederService } from '../services/concept-seeder.service'
import { ConceptSyncService } from '../services/concept-sync.service'
import { SyncConceptResponseDto } from '../dto/ontology-extract.dto'

@Controller('concepts')
export class ConceptController {
    private readonly logger = new Logger(ConceptController.name)

    constructor(
        private readonly seederService: ConceptSeederService,
        private readonly syncService: ConceptSyncService
    ) {}

    @Post('seed')
    async seedConcepts(): Promise<SyncConceptResponseDto> {
        this.logger.log('Received request to seed concepts from ontology.json')
        return await this.seederService.seedFromOntologyJson()
    }

    @Post('sync-to-knowledge')
    async syncToKnowledge(): Promise<SyncConceptResponseDto> {
        this.logger.log('Received request to sync concepts to knowledge chunks')
        return await this.syncService.syncConceptsToKnowledgeChunks()
    }
}
