import { Controller, Post, Param, Logger } from '@nestjs/common'
import { LecturerOntologyService } from '../services/lecturer-ontology.service'
import { SyncLecturerResponseDto } from '../dto/ontology-extract.dto'

@Controller('lecturers')
export class LecturerOntologyController {
    private readonly logger = new Logger(LecturerOntologyController.name)

    constructor(private readonly lecturerOntologyService: LecturerOntologyService) {}

    @Post(':id/sync-ontology')
    async syncOntology(@Param('id') lecturerId: string): Promise<SyncLecturerResponseDto> {
        this.logger.log(`Received request to sync ontology for lecturer: ${lecturerId}`)
        return await this.lecturerOntologyService.syncLecturerOntology(lecturerId)
    }

    @Post('sync-all')
    async syncAll() {
        this.logger.log('Received request to sync all lecturers')
        return await this.lecturerOntologyService.syncAllLecturers()
    }
}
