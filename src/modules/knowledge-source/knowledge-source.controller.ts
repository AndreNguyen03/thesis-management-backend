import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { KnowledgeSourceService } from './application/knowledge-source.service'
import { RequestKnowledgeSourceDto } from './dto/request-get-knowledge-source.dto'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeSourceDto, GetPaginatedKnowledgeSourcesDto } from './dto/get-knowledge-source.dto'
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto'
@Controller('knowledge-sources')
export class KnowledgeSourceController {
    constructor(private readonly knowledgeSourceService: KnowledgeSourceService) {}
    @Get()
    @Auth(AuthType.None)
    async findAll(@Query() query: RequestKnowledgeSourceDto) {
        const klResult = await this.knowledgeSourceService.findAll(query)
        return plainToInstance(GetPaginatedKnowledgeSourcesDto, klResult, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Patch('/:id')
    @Auth(AuthType.None)
    async updateKnowledgeSources(@Body() body: UpdateKnowledgeSourceDto, @Param('id') klid: string) {
        const result = await this.knowledgeSourceService.updateKnowledgeSources(klid, body)
        return plainToInstance(GetKnowledgeSourceDto, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
