import { Controller, Get, Body, Post, Patch, Param, Delete, Query } from '@nestjs/common'
import { ThesisService } from './application/thesis.service'
import { Auth } from '../auth/decorator/auth.decorator'
import { AuthType } from '../auth/enum/auth-type.enum'
import { CreateThesisDto } from './dtos/createThesis.dto'
import { PatchThesisDto } from './dtos'
@Controller('theses')
export class ThesisController {
    // create endpoint to add thesis
    constructor(private readonly thesisService: ThesisService) {}
    @Get('/student/:id')
    @Auth(AuthType.None)
    public getRegisteredTheses(@Param('id') studentId: string) {
        return this.thesisService.studentGetRegisteredThesis(studentId)
    }

    @Get('saved-by-user')
    @Auth(AuthType.None)

    async getSavedTheses(
        @Query('userId') userId: string,
        @Query('role') role: string
    ) {
        return this.thesisService.getSavedThesesByUser(userId, role)
    }


@Post('save')
    @Auth(AuthType.None)

async saveThesis(
    @Body('userId') userId: string,
    @Body('role') role: string,
    @Body('thesisId') thesisId: string
) {
    return this.thesisService.saveThesis(userId, role, thesisId)
}

    @Get('/student')
    @Auth(AuthType.None)
    public async getTheses() {
        return await this.thesisService.getAllTheses()
    }

    @Post()
    @Auth(AuthType.None)
    public async createThesis(@Body() thesis: CreateThesisDto) {
        return await this.thesisService.createThesis(thesis)
    }

    @Patch(':id')
    @Auth(AuthType.None)
    public async updateThesis(@Param('id') id: string, @Body() thesis: PatchThesisDto) {
        return await this.thesisService.updateThesis(id, thesis)
    }

    @Delete(':id')
    @Auth(AuthType.None)
    public async deleteThesis(@Param('id') id: string) {
        return await this.thesisService.deleteThesis(id)
    }

    @Patch('/student/:id/register/:thesisId')
    @Auth(AuthType.None)
    public async studentRegisterThesis(@Param('id') id: string, @Param('thesisId') thesisId: string) {
        console.log('controller registeration')
        return await this.thesisService.studentRegisterThesis(id, thesisId)
    }
}
