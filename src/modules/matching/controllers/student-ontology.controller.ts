import { Controller, Post, Param, Logger } from '@nestjs/common'
import { StudentOntologyService } from '../services/student-ontology.service'
import { ComputeOntologyResponseDto } from '../dto/ontology-extract.dto'

@Controller('students')
export class StudentOntologyController {
    private readonly logger = new Logger(StudentOntologyController.name)

    constructor(private readonly studentOntologyService: StudentOntologyService) {}

    @Post(':id/compute-ontology')
    async computeOntology(@Param('id') studentId: string): Promise<ComputeOntologyResponseDto> {
        this.logger.log(`Received request to compute ontology for student: ${studentId}`)
        return await this.studentOntologyService.computeStudentOntology(studentId)
    }
}
