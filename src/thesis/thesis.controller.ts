import { Controller, Get, Body, Post, Patch, Param, Delete, Query, Req } from '@nestjs/common'
import { ThesisService } from './application/thesis.service'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { CreateThesisDto } from './dtos/createThesis.dto'
import { PatchThesisDto, ReplyRegistrationDto } from './dtos'
import { ActiveUserData } from '../auth/interface/active-user-data.interface'
import { WrongRoleException } from '../common/exceptions'
@Controller('theses')
export class ThesisController {
    // create endpoint to add thesis
    constructor(private readonly thesisService: ThesisService) {}
    @Get('/get-registered')
    @Auth(AuthType.Bearer)
    async getRegisteredTheses(@Req() req: { user: ActiveUserData }) {
        return await this.thesisService.getRegisteredThesis(req.user)
    }

    @Get('saved-by-user')
    @Auth(AuthType.None)
    async getSavedTheses(@Query('userId') userId: string, @Query('role') role: string) {
        return this.thesisService.getSavedThesesByUser(userId, role)
    }

    @Post('save')
    @Auth(AuthType.None)
    async saveThesis(@Body('userId') userId: string, @Body('role') role: string, @Body('thesisId') thesisId: string) {
        return this.thesisService.saveThesis(userId, role, thesisId)
    }

    @Get('/student')
    @Auth(AuthType.None)
    async getTheses() {
        return await this.thesisService.getAllTheses()
    }

    @Post()
    @Auth(AuthType.None)
    async createThesis(@Body() thesis: CreateThesisDto) {
        return await this.thesisService.createThesis(thesis)
    }

    @Patch(':id')
    @Auth(AuthType.None)
    async updateThesis(@Param('id') id: string, @Body() thesis: PatchThesisDto) {
        return await this.thesisService.updateThesis(id, thesis)
    }

    @Delete('/delete/:id')
    @Auth(AuthType.None)
    async deleteThesis(@Param('id') id: string) {
        return await this.thesisService.deleteThesis(id)
    }

    @Patch('/register-thesis/:thesisId')
    @Auth(AuthType.Bearer)
    async createThesisRegistration(@Req() req: { user: ActiveUserData }, @Param('thesisId') thesisId: string) {
        const { sub: userId, role } = req.user
        return await this.thesisService.registerForThesis(userId, thesisId, role)
    }
    @Delete('/cancel-registration/:thesisId')
    @Auth(AuthType.Bearer)
    async cancelRegistration(@Req() req: { user: ActiveUserData }, @Param('thesisId') thesisId: string) {
        const { sub: userId, role } = req.user
        return await this.thesisService.cancelRegistration(userId, thesisId, role)
    }

    // @Patch('/lecturer/reply-registration')
    // @Auth(AuthType.Bearer)
    // public async lecturerReplyRegistration(
    //     @Req() req: { user: ActiveUserData },
    //     @Body() replyRegistrationDto: ReplyRegistrationDto
    // ) {
    //     const { sub: userId, role } = req.user
    //     if (role !== 'lecturer') {
    //         throw new WrongRoleException('register thesis, feature is only for lecturer')
    //     }
    //     return await this.thesisService.lecturerReplyRegistration(userId, replyRegistrationDto)
    // }
}
