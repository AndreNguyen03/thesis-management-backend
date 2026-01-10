import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { TopicSearchService } from './application/search.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { SearchRegisteringTopicsDto, SearchTopicsInLibraryDto } from './dtos/search.dtos'
import {
    PaginatedGeneralTopics,
    PaginatedTopicsInLibrary,
    RequestGetTopicsInAdvanceSearchParams,
    RequestGetTopicsInPhaseParams
} from '../topics/dtos'

import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { VectorSyncProvider } from './provider/vector-sync.provider'
import { plainToInstance } from 'class-transformer'
import { GetTopicProvider } from '../topics/providers/get-topic.provider'

@Controller('topic-search')
export class TopicSearchController {
    constructor(
        private readonly searchService: TopicSearchService,
        private readonly vectorSyncProvider: VectorSyncProvider,
        private readonly getTopicProvider: GetTopicProvider
    ) {}

    @Get('/advance/topics-in-open-registration/:periodId')
    async getTopicsInOpenRegistration(@Param('periodId') periodId: string) {
        return await this.searchService.getPendingRegistrationTopics(periodId)
    }

    @Post('/sync-topics/in-period-on-phase/:periodId')
    //trước mắt là ban chủ nhiệm
    @Auth(AuthType.Bearer)
    async syncTopic(@Param('periodId') periodId: string, @Query() query: RequestGetTopicsInPhaseParams) {
        query.limit = 0
        await this.vectorSyncProvider.syncDataInPeriodOnPhase(periodId, query)
        return { message: 'Đang xử lý đồng bộ dữ liệu đề tài đăng ký' }
    }

    //tìm kiếm trong kì hiện tại
    //Dùng cho ban chủ nhiệm, giảng viên, sinh viên
    @Get('/prompt/registering-topics')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER, UserRole.STUDENT)
    @Auth(AuthType.Bearer)
    async recommendRegisteringTopicsWithDescription(
        @Req() req: { user: ActiveUserData },
        @Body() searchTopicsDto: SearchRegisteringTopicsDto
    ) {
        const ré = await this.searchService.recommendRegisteringTopics(req.user.facultyId!, searchTopicsDto)
        return ré
    }

    //tìm kiếm trong tập dữ liệu đề tài đã duyệt
    @Get('/prompt/topics-in-library')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER, UserRole.STUDENT)
    @Auth(AuthType.Bearer)
    async recommendTopicsInLibraryWithDescription(@Body() searchTopicsDto: SearchTopicsInLibraryDto) {
        return await this.searchService.recommendTopicsInLibrary(searchTopicsDto)
    }

    @Get('/advance/registering-topics/:periodId')
    async searchTopicsOpenRegistrationWithDescription(
        @Param('periodId') periodId: string,
        @Query() query: RequestGetTopicsInAdvanceSearchParams
    ) {
        let topics
        if (query.rulesPagination === 100)
            topics = await this.searchService.semanticSearchRegisteringTopic(periodId, query)
        else topics = await this.getTopicProvider.getRegisteringTopics(periodId, query)
        return plainToInstance(PaginatedGeneralTopics, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/advance/topics-in-library')
    async searchTopicsInLibrary(@Query() query: RequestGetTopicsInAdvanceSearchParams) {
        let topics
        // console.log('rulesPagination:', query.rulesPagination)
        //query.search_by = 'titleVN,titleEng'
        if (query.rulesPagination === 100) topics = await this.searchService.semanticSearchLibraryTopic(query)
        else topics = await this.getTopicProvider.getTopicsInLibrary(query)
        return plainToInstance(PaginatedTopicsInLibrary, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
