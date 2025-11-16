import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { FacultyService } from './application/faculty.service'
import { Faculty } from './schemas/faculty.schema'
import { Paginated } from '../../common/pagination/interface/paginated.interface'
import { CreateFacultyDto, CreateFacultyListDto, GetFacultyDto, GetPaginatedFacultyDto } from './dtos/faculty.dtos'
import { plainToInstance } from 'class-transformer'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'

@ApiTags('Faculties')
@ApiBearerAuth()
@Controller('faculties')
export class FacultyController {
    constructor(private readonly facultyService: FacultyService) {}

    @Get()
    @Auth(AuthType.None)
    async getAllFaculties(@Query() query: PaginationQueryDto): Promise<GetPaginatedFacultyDto> {
        const facultyData = await this.facultyService.getAllFaculties(query)
        return plainToInstance(GetPaginatedFacultyDto, facultyData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/')
    @Auth(AuthType.None)
    async createFaculty(@Body() createFaculty: CreateFacultyDto) {
        const facultyData = await this.facultyService.createFaculty(createFaculty)
        return plainToInstance(GetFacultyDto, facultyData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/create-many')
    @Auth(AuthType.None)
    async createManyFaculties(@Body() createFacultyListDto: CreateFacultyListDto) {
        console.log('Received request to create many faculties:', createFacultyListDto)
        const facultyData = await this.facultyService.createManyFaculties(createFacultyListDto.faculties)
        return {
            message: `Đã thêm thành công ${facultyData.createdCount} khoa`
        }
    }
}
