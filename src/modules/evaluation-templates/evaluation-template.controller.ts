import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { EvaluationTemplateService } from './evaluation-template.service'
import { CreateEvaluationTemplateDto, UpdateEvaluationTemplateDto } from './dtos'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@ApiTags('Evaluation Templates')
@Auth(AuthType.Bearer) // Global auth
@Controller('evaluation-templates')
export class EvaluationTemplateController {
    constructor(private readonly service: EvaluationTemplateService) {}

    @Post()
    @Roles(UserRole.FACULTY_BOARD) // Chỉ BCN mới tạo được template
    @ApiOperation({ summary: 'Tạo template đánh giá mới (Faculty Board only)' })
    async create(@Body() dto: CreateEvaluationTemplateDto, @Req() req: { user: ActiveUserData }) {
        return this.service.create(dto, req.user.sub)
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách templates' })
    @ApiQuery({ name: 'facultyId', required: false, description: 'Lọc theo khoa' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Lọc theo trạng thái' })
    async findAll(@Query('facultyId') facultyId?: string, @Query('isActive') isActive?: string) {
        const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined
        return this.service.findAll(facultyId, isActiveBool)
    }

    @Get('faculty/:facultyId/default')
    @ApiOperation({ summary: 'Lấy template mặc định của faculty' })
    async getDefaultForFaculty(@Param('facultyId') facultyId: string) {
        return this.service.getDefaultForFaculty(facultyId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết template' })
    async findById(@Param('id') id: string) {
        return this.service.findById(id)
    }

    @Put(':id')
    @Roles(UserRole.FACULTY_BOARD) // Chỉ BCN mới update được
    @ApiOperation({ summary: 'Cập nhật template (Faculty Board only)' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateEvaluationTemplateDto,
        @Req() req: { user: ActiveUserData }
    ) {
        return this.service.update(id, dto, req.user.sub)
    }

    @Delete(':id')
    @Roles(UserRole.FACULTY_BOARD) // Chỉ BCN mới xóa được
    @ApiOperation({ summary: 'Xóa template (soft delete) (Faculty Board only)' })
    async delete(@Param('id') id: string, @Req() req: { user: ActiveUserData }) {
        return this.service.delete(id, req.user.sub)
    }
}
