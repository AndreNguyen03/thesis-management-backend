import { Controller, Post, Body, Logger } from '@nestjs/common'
import { MatchingService } from '../services/matching.service'
import { FindLecturersRequestDto, FindLecturersResponseDto } from '../dto/matching.dto'

@Controller('matching')
export class MatchingController {
    private readonly logger = new Logger(MatchingController.name)

    constructor(private readonly matchingService: MatchingService) {}

    @Post('find-lecturers')
    async findLecturers(@Body() dto: FindLecturersRequestDto): Promise<FindLecturersResponseDto> {
        this.logger.log(`Received request to find lecturers for student: ${dto.studentId}`)
        return await this.matchingService.findMatchingLecturers(dto.studentId, dto.topK || 10)
    }
}
