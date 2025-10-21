import { Body, Controller, Delete, Param, Post } from '@nestjs/common'
import { RefFieldsTopicsService } from './application/ref_fields_topics.service'
import { CreateRefFieldsTopicDto } from './dtos/ref-fields-topics.dto'

@Controller('ref-fields-topics')
export class RefFieldsTopicsController {
    constructor(private readonly refFieldsTopicsService: RefFieldsTopicsService) {}
    @Post()
    async createRefFieldsTopic(@Body() createDto: CreateRefFieldsTopicDto) {
        return await this.refFieldsTopicsService.createWithFieldIds(createDto.topicId, createDto.fieldIds)
    }
    @Delete('/delete-fields-topic')
    deleteByFieldIdsAndTopicId(@Body() deleteDto: CreateRefFieldsTopicDto) {
        return this.refFieldsTopicsService.deleteRefFieldsTopicByFieldIdsAndTopicId(
            deleteDto.topicId,
            deleteDto.fieldIds
        )
    }
    @Delete('/delete-by-topic/:topicId')
    deleteByTopicId(@Param('topicId') topicId: string) {
        return this.refFieldsTopicsService.deleteAllByTopicId(topicId)
    }
}
