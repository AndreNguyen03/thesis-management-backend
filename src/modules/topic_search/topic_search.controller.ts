import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common'
import { TopicSearchService } from './application/search.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { SearchRegisteringTopicsDto, SearchTopicsInLibraryDto } from './dtos/search.dtos'
import { RequestGetTopicsInPhaseDto } from '../topics/dtos'

import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { VectorSyncProvider } from './provider/vector-sync.provider'

@Controller('topic-search')
export class TopicSearchController {
    constructor(
        private readonly searchService: TopicSearchService,
        private readonly vectorSyncProvider: VectorSyncProvider
    ) {}
    @Get('/sync-topics/in-period-on-phase/:periodId')
    //trước mắt là ban chủ nhiệm
    @Auth(AuthType.Bearer)
    async syncTopic(@Param('periodId') periodId: string, @Query() query: RequestGetTopicsInPhaseDto) {
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
        return await this.searchService.recommendRegisteringTopics(req.user.facultyId!, searchTopicsDto)
    }

    //tìm kiếm trong tập dữ liệu đề tài đã duyệt
    @Get('/prompt/topics-in-library')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER, UserRole.STUDENT)
    @Auth(AuthType.Bearer)
    async recommendTopicsInLibraryWithDescription(@Body() searchTopicsDto: SearchTopicsInLibraryDto) {
        return await this.searchService.recommendTopicsInLibrary(searchTopicsDto)
    }

    @Get('/advance/registering-topics/:periodId')
    async searchTopicsInLibraryWithDescription(
        @Param('periodId') periodId: string,
        @Query() query: RequestGetTopicsInPhaseDto
    ) {
        return await this.searchService.semanticSearchRegisteringTopic(periodId, query)
        //  return plainToInstance(PaginatedGeneralTopics, topics, {
        //             excludeExtraneousValues: true,
        //             enableImplicitConversion: true
        //         })
    }
    //      @Get('/advance/topics-in-library')
}
