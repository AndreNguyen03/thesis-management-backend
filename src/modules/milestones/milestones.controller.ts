import {
    Body,
    Controller,
    Get,
    Inject,
    Param,
    Post,
    Put,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { MilestonesService } from './application/milestones.service'
import { PayloadCreateMilestone, PayloadUpdateMilestone } from './dtos/request-milestone.dto'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { plainToInstance } from 'class-transformer'
import { ResponseMilestone } from './dtos/response-milestone.dto'
import { FileInfo } from './schemas/milestones.schemas'
import { RequestCreate } from '../todolists/dtos/request-update.dtos'

@Controller('milestones')
export class MilestonesController {
    constructor(@Inject() private readonly milestonesService: MilestonesService) {}
    @Get('/in-group/:groupId/')
    async getMilestonesOfGroup(@Param('groupId') groupId: string) {
        const res = await this.milestonesService.getMilestonesOfGroup(groupId)
        return plainToInstance(ResponseMilestone, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Post('/create-task')
    async createTaskInMineTones(@Body() body: RequestCreate) {
        return await this.milestonesService.createTaskInMinesTone(body)
    }
    @Post('')
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async createMilestone(@Body() body: PayloadCreateMilestone) {
        return plainToInstance(ResponseMilestone, await this.milestonesService.createMilestone(body), {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    // @Put(':milestoneId')
    // @Roles(UserRole.LECTURER)
    // @UseGuards(RolesGuard)
    // @UseInterceptors(FilesInterceptor('files'))
    // async updateMilestone(@Param('milestoneId') milestoneId: string, @Body() body: PayloadUpdateMilestone) {
    //     return await this.milestonesService.updateMilestone(milestoneId, body)
    // }
    @Post('/:milestoneId/submit')
    @UseInterceptors(FilesInterceptor('files'))
    async submitReport(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('milestoneId') milestoneId: string,
        @Req() req: { user: ActiveUserData }
    ): Promise<FileInfo[]> {
        return await this.milestonesService.submitReport(files, milestoneId, req.user.sub)
    }
}
