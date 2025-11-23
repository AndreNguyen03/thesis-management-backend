import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common'
import { MajorsService } from './application/majors.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { CreateMajorDto } from './dtos/create-major.dto'
import { plainToInstance } from 'class-transformer'
import { PaginatedMajorsDto } from './dtos/get-major.dto'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'

@Controller('majors')
export class MajorsController {
    constructor(private readonly majorsService: MajorsService) {}
    @Post()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.ADMIN)
    async createMajor(@Body() createMajorDto: CreateMajorDto) {
        const result = await this.majorsService.createMajor(createMajorDto)
        return {
            message: 'Tạo ngành thành công',
            major: result.name
        }
    }

    @Get()
    @Auth(AuthType.Bearer)
    async getMajorsOfFacultyOwner(@Req() req: { user: { facultyId: string } }, @Query() query: PaginationQueryDto) {
        const result = await this.majorsService.getMajorsOfFacultyOwner(req.user.facultyId, query)
        return await plainToInstance(PaginatedMajorsDto, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
