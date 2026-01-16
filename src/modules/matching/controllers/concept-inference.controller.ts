import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { StudentConceptInferenceService } from '../services/student-concept-inference.service'
import { InferConceptRequestDto } from '../dtos/infer-concept-request.dto'
import { InferConceptResponseDto } from '../dtos/infer-concept-response.dto'

@ApiTags('Concept Inference')
@Controller('matching/concepts')
export class ConceptInferenceController {
    private readonly logger = new Logger(ConceptInferenceController.name)

    constructor(private readonly conceptInferenceService: StudentConceptInferenceService) {}

    @Post('infer-student')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Infer concepts from student profile',
        description: `
            Pipeline for inferring concepts from student profile:
            1. Retrieve student information (interests, skills)
            2. Group skills into concept categories
            3. Text processing for each item
            4. Match with concept aliases (exact match)
            5. If no match, use cosine similarity with concept embeddings
            6. Return set of matched concepts with keys, labels, and aliases
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Concepts successfully inferred',
        type: InferConceptResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Student not found'
    })
    async inferConceptsForStudent(@Body() request: InferConceptRequestDto): Promise<InferConceptResponseDto> {
        this.logger.log(`Received concept inference request for student: ${request.studentId}`)

        const result = await this.conceptInferenceService.inferConceptsForStudent(request.studentId)

        this.logger.log(
            `Concept inference completed for student ${request.studentId}. ` + `Found ${result.totalConcepts} concepts`
        )

        return result
    }

    @Post('infer-student-batch')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Batch infer concepts for multiple students',
        description: 'Process multiple students in a single request'
    })
    @ApiResponse({
        status: 200,
        description: 'Batch inference completed',
        type: [InferConceptResponseDto]
    })
    async inferConceptsForMultipleStudents(
        @Body() request: { studentIds: string[] }
    ): Promise<InferConceptResponseDto[]> {
        this.logger.log(`Received batch inference request for ${request.studentIds.length} students`)

        const results = await this.conceptInferenceService.inferConceptsForMultipleStudents(request.studentIds)

        this.logger.log(`Batch inference completed. Processed ${results.length} students`)

        return results
    }
}
