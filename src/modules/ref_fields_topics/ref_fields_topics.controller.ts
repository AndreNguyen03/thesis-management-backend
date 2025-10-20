import { Body, Controller, Delete, Param, Post } from '@nestjs/common'
import { RefFieldsTopicsService } from './application/ref_fields_topics.service'
import { CreateRefFieldsTopicDto } from './dtos/ref-fields-topics.dto'
import { CreateRefRequirementsTopicDto } from '../ref_requirements_topics/dtos/create-ref-requirement-topic.dtos'

@Controller('ref-fields-topics')
export class RefFieldsTopicsController {
    constructor(private readonly refFieldsTopicsService: RefFieldsTopicsService) {}
    @Post()
    createRefFieldsTopic(@Body() createDto: CreateRefFieldsTopicDto) {
        return this.refFieldsTopicsService.createRefFieldsTopic(createDto.topicId, createDto.fieldId)
    }
    @Delete('/delete-fields-topic')
    deleteByRequirementIdsAndTopicId(@Body() deleteDto: CreateRefRequirementsTopicDto) {
        return this.refFieldsTopicsService.deleteRefFieldsTopicByFieldIdsAndTopicId(
            deleteDto.topicId,
            deleteDto.requirementId
        )
    }
    @Delete('/delete-by-topic/:topicId')
    deleteByTopicId(@Param('topicId') topicId: string) {
        return this.refFieldsTopicsService.deleteManyByTopicId(topicId)
    }
}
