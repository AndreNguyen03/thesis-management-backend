import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger'
import { ConceptEvolutionService } from './application/concept-evolution.service'
import {
    ConceptCandidateResponseDto,
    ConceptCandidateListQueryDto,
    ApproveConceptDto,
    RejectConceptDto
} from './dtos/concept-candidate.dto'
import { Auth } from '../../../auth/decorator/auth.decorator'
import { AuthType } from '../../../auth/enum/auth-type.enum'
import { Roles } from '../../../auth/decorator/roles.decorator'
import { UserRole } from '../../../users/enums/user-role'

@ApiTags('Admin - Concept Management')
@Controller('admin/concepts')
@Auth(AuthType.Bearer)
@Roles(UserRole.ADMIN)
export class ConceptAdminController {
    constructor(private readonly evolutionService: ConceptEvolutionService) {}

    @Get('candidates')
    @ApiOperation({
        summary: 'Get concept candidates',
        description: 'Get paginated list of concept candidates detected from profiles'
    })
    @ApiResponse({ status: 200, description: 'Concept candidates retrieved' })
    async getCandidates(@Query() query: ConceptCandidateListQueryDto) {
        return this.evolutionService.getCandidates(query)
    }

    @Get('candidates/statistics')
    @ApiOperation({
        summary: 'Get concept candidates statistics',
        description: 'Get overview statistics of concept candidates'
    })
    @ApiResponse({ status: 200, description: 'Statistics retrieved' })
    async getStatistics() {
        return this.evolutionService.getStatistics()
    }

    @Get('candidates/:id')
    @ApiOperation({
        summary: 'Get concept candidate by ID',
        description: 'Get detailed information about a specific concept candidate'
    })
    @ApiParam({ name: 'id', description: 'Concept candidate ID' })
    @ApiResponse({ status: 200, description: 'Candidate retrieved', type: ConceptCandidateResponseDto })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async getCandidateById(@Param('id') id: string): Promise<ConceptCandidateResponseDto> {
        return this.evolutionService.getCandidateById(id)
    }

    @Post('candidates/:id/approve')
    @ApiOperation({
        summary: 'Approve concept candidate',
        description: 'Approve a concept candidate and add it to the concepts collection'
    })
    @ApiParam({ name: 'id', description: 'Concept candidate ID' })
    @ApiResponse({ status: 200, description: 'Candidate approved', type: ConceptCandidateResponseDto })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    @ApiResponse({ status: 400, description: 'Candidate already processed or concept key exists' })
    async approveCandidate(
        @Param('id') id: string,
        @Body() approveDto: ApproveConceptDto,
        @Req() req: any
    ): Promise<ConceptCandidateResponseDto> {
        const userId = req.user.userId
        return this.evolutionService.approveCandidate(id, approveDto, userId)
    }

    @Post('candidates/:id/reject')
    @ApiOperation({
        summary: 'Reject concept candidate',
        description: 'Reject a concept candidate with a reason'
    })
    @ApiParam({ name: 'id', description: 'Concept candidate ID' })
    @ApiResponse({ status: 200, description: 'Candidate rejected', type: ConceptCandidateResponseDto })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    @ApiResponse({ status: 400, description: 'Candidate already processed' })
    async rejectCandidate(
        @Param('id') id: string,
        @Body() rejectDto: RejectConceptDto
    ): Promise<ConceptCandidateResponseDto> {
        return this.evolutionService.rejectCandidate(id, rejectDto.reason)
    }

    @Delete('candidates/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete concept candidate',
        description: 'Permanently delete a concept candidate (rejected candidates only)'
    })
    @ApiParam({ name: 'id', description: 'Concept candidate ID' })
    @ApiResponse({ status: 204, description: 'Candidate deleted' })
    @ApiResponse({ status: 404, description: 'Candidate not found' })
    async deleteCandidate(@Param('id') id: string): Promise<void> {
        return this.evolutionService.deleteCandidate(id)
    }

    @Post('reload-index')
    @ApiOperation({
        summary: 'Reload concept index',
        description: 'Trigger a reload of the in-memory concept index after approving new concepts'
    })
    @ApiResponse({ status: 200, description: 'Concept index reloaded successfully' })
    async reloadConceptIndex() {
        // This would trigger ProfileMatchingProvider to reload its concept index
        // Implementation depends on how you want to handle this (event emitter, direct call, etc.)
        return {
            message: 'Concept index reload triggered. Restart the application to apply changes.',
            note: 'In production, implement a hot-reload mechanism using events or cache invalidation'
        }
    }
}
