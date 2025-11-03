import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { FacultyService } from './application/faculty.service'
import { Faculty } from './schemas/faculty.schema'
import { PaginationQueryDto } from '../../common/pagination/dtos/pagination-query.dto'
import { Paginated } from '../../common/pagination/interface/paginated.interface'
import { CreateFacultyDto, ResponseFacultyDto } from './dtos/faculty.dtos'

@ApiTags('Faculties')
@ApiBearerAuth()
@Auth(AuthType.Bearer)
@Controller('faculties')
export class FacultyController {
    constructor(private readonly facultyService: FacultyService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new faculty' })
    @ApiResponse({ status: 201, description: 'Faculty created', type: Faculty })
    async createFaculty(@Body() createDto: Partial<Faculty>): Promise<Faculty> {
        return this.facultyService.createFaculty(createDto)
    }

    @Post('batch')
    @ApiOperation({ summary: 'Create multiple faculties in batch' })
    @ApiResponse({ status: 201, description: 'Batch create faculties', type: [Faculty] })
    async createMany(
        @Body() faculties: CreateFacultyDto[]
    ): Promise<{ success: boolean; createdCount?: number; errors?: any[] }> {
        // map CreateFacultyDto => Partial<Faculty>
        const facultyEntities: Partial<Faculty>[] = faculties.map((f) => ({
            name: f.name,
            urlDirection: f.urlDirection,
            email: f.email
        }))
        return this.facultyService.createManyFaculties(facultyEntities)
    }

    @Get()
    @ApiOperation({ summary: 'Get all faculties with pagination and search' })
    @ApiResponse({ status: 200, description: 'List of faculties', type: [Faculty] })
    async getAllFaculties(@Query() query: PaginationQueryDto): Promise<Paginated<Faculty>> {
        return this.facultyService.getAllFaculties(query)
    }

    @Get('all')
    @ApiOperation({ summary: 'Get all faculties (no pagination, for dropdown lists)' })
    @ApiResponse({ status: 200, description: 'All faculties', type: [ResponseFacultyDto] })
    async getAllWithoutPagination(): Promise<ResponseFacultyDto[]> {
        const result = await this.facultyService.findAll({})
        return result.datas.map((f: any) => ({
            id: f._id.toString(),
            name: f.name,
            urlDirection: f.urlDirection,
            email: f.email,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt
        }))
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a faculty by ID' })
    @ApiResponse({ status: 200, description: 'Faculty found', type: Faculty })
    async getFacultyById(@Param('id') id: string): Promise<Faculty | null> {
        return this.facultyService.getFacultyById(id)
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a faculty' })
    @ApiResponse({ status: 200, description: 'Faculty updated', type: Faculty })
    async updateFaculty(@Param('id') id: string, @Body() updateDto: Partial<Faculty>): Promise<Faculty | null> {
        return this.facultyService.updateFaculty(id, updateDto)
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a faculty' })
    @ApiResponse({ status: 200, description: 'Faculty deleted' })
    async removeFaculty(@Param('id') id: string): Promise<boolean> {
        return this.facultyService.deleteFaculty(id)
    }
}
