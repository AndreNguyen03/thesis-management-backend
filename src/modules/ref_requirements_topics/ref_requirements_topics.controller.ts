import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { RefRequirementsTopicsService } from './application/ref_requirements_topics.service'
import { CreateRefRequirementsTopicDto } from './dtos/create-ref-requirement-topic.dtos'

@Controller('ref-requirements-topics')
export class RefRequirementsTopicsController {
    constructor(private readonly refRequirementsTopicsService: RefRequirementsTopicsService) {}
    @Post()
    createRefRequirementsTopic(@Body() createDto: CreateRefRequirementsTopicDto) {
        return this.refRequirementsTopicsService.createRefRequirementsTopic(createDto.topicId, createDto.requirementIds)
    }
    @Delete('/delete-requirements-topic')
    deleteByRequirementIdsAndTopicId(@Body() deleteDto: CreateRefRequirementsTopicDto) {
        return this.refRequirementsTopicsService.deleteRefRequirementTopicByRequirementIdsAndTopicId(
            deleteDto.topicId,
            deleteDto.requirementIds
        )
    }
    @Delete('/delete-by-topic/:topicId')
    deleteByTopicId(@Param('topicId') topicId: string) {
        return this.refRequirementsTopicsService.deleteAllByTopicId(topicId)
    }
}
