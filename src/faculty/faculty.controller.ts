import { Body, Controller, Post } from '@nestjs/common'
import { FacultyService } from './application/faculty.service'
import { CreateFacultyDto } from './dtos/faculty.dtos'

@Controller('Faculty')
export class FacultyController {
    constructor(private readonly facultyService: FacultyService) {}

    @Post('create-many-Faculty')
    async createManyFaculty(@Body() facultys: CreateFacultyDto[]): Promise<{ success: boolean }> {
        const success = await this.facultyService.createManyFacultys(facultys)
        return { success }
    }
}
