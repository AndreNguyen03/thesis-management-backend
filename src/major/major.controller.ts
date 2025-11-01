import { Body, Controller, Post } from '@nestjs/common'
import { MajorService } from './application/major.service'
import { CreateMajorDto } from './dtos/major.dtos'

@Controller('Major')
export class MajorController {
    constructor(private readonly majorService: MajorService) {}

    @Post('create-many-Major')
    async createManyMajor(@Body() majors: CreateMajorDto[]): Promise<{ success: boolean }> {
        const success = await this.majorService.createManyMajors(majors)
        return { success }
    }
}
