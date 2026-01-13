import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UploadedFile,
    UploadedFiles,
    UseInterceptors
} from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { KnowledgeSourceService } from './application/knowledge-source.service'
import { RequestKnowledgeSourceDto } from './dto/request-get-knowledge-source.dto'
import { plainToInstance } from 'class-transformer'
import { GetKnowledgeSourceDto, GetPaginatedKnowledgeSourcesDto } from './dto/get-knowledge-source.dto'
import { UpdateKnowledgeSourceDto } from './dto/update-knowledge-source.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { RetrievalProvider } from '../chatbot/providers/retrieval.provider'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ActiveUser } from '../../auth/decorator/active-user.decorator'
import { CreateFileDocumentDto } from './dto/create-file-document.dto'
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

    @Patch('/:id/knowledge-chunks')
    @Auth(AuthType.Bearer)
    @UseInterceptors(FilesInterceptor('files'))
    //Thêm chunks mới cho knowledge source đã có sẵn
    async updateKnowledgeChunksOfKnowledgeSource(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('id') klid: string,
        @ActiveUser() user: ActiveUserData
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Chưa có file được tải lên')
        }
        const result = await this.retrievalProvider.processUploadedFileInAvailableKnowledge(user.sub, files[0], klid)
        return plainToInstance(GetKnowledgeSourceDto, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Patch('/:id')
    @Auth(AuthType.None)
    //update knowledge info
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

    //sync lecturer profiles
    @Post('/sync-lecturer-profiles')
    async syncLecturerProfiles(@Req() req: { user: ActiveUserData }) {
        return await this.knowledgeSourceService.syncLecturerProfiles(req.user.sub)
    }
    @Get('/search-semantic')
    async semanticSearchKnowledgeSources(@Query('query') query: string) {
        return await this.knowledgeSourceService.semanticSearchKnowledgeSources(query)
    }

    @Post('upload-files')
    @Auth(AuthType.Bearer)
    @UseInterceptors(FilesInterceptor('files'))
    async uploadKnowledgeFile(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: CreateFileDocumentDto,
        @ActiveUser() user: ActiveUserData
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Chưa có file được tải lên')
        }
        return await this.retrievalProvider.processUploadedFileInNewKnowledge(user.sub, files[0], body)
    }

    @Delete('/:id')
    @Auth(AuthType.None)
    async deleteKnowledgeSource(@Param('id') klid: string) {
        return await this.knowledgeSourceService.deleteKnowledgeSource(klid)
    }
}
