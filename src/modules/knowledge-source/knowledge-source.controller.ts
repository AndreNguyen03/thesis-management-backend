import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { KnowledgeSourceService } from './application/knowledge-source.service'
import { RequestKnowledgeSourceDto } from './dto/request-get-knowledge-source.dto'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeSourceDto, GetPaginatedKnowledgeSourcesDto } from './dto/get-knowledge-source.dto'
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { RetrievalProvider } from '../chatbot/providers/retrieval.provider'
@Controller('knowledge-sources')
export class KnowledgeSourceController {
    constructor(
        private readonly knowledgeSourceService: KnowledgeSourceService,
        private readonly retrievalProvider: RetrievalProvider
    ) {}
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

    //sync registering topics và topics in library
    @Post('/sync-topics-to-knowledge-source')
    async syncTopicsToKnowledgeSource(@Body() body: { periodId: string }, @Req() req: { user: ActiveUserData }) {
        return await this.knowledgeSourceService.syncTopicsDataToKnowledgeSource(body.periodId, req.user.sub)
    }
    @Get('/search-semantic')
    async semanticSearchKnowledgeSources(@Query('query') query: string) {
        return await this.knowledgeSourceService.semanticSearchKnowledgeSources(query)
    }
}
