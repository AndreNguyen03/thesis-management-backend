import { Body, Controller, Get, Inject, Post, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { plainToInstance } from 'class-transformer'
import { IRequirementsRepository } from './repository/requirements.repository.interface'
import { GetRequirementNameReponseDto, PaginatedRequirements } from './dtos/get-requirement.dto'
import { CreateRequirementDto } from './dtos/create-requirement.dto'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
@Controller('requirements')
export class RequirementsController {
    constructor(@Inject('IRequirementsRepository') private readonly requirementsRepository: IRequirementsRepository) {}
    @Get('/get-all/combobox')
    @Auth(AuthType.None)
    async getAllRequirements(@Query() query: PaginationQueryDto) {
        const requirementData = await this.requirementsRepository.getAllRequirements(query)
        return plainToInstance(PaginatedRequirements, requirementData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/')
    @Auth(AuthType.None)
    async createRequirement(@Body() createRequirementDto: CreateRequirementDto) {
        const fieldData = await this.requirementsRepository.createRequirement(createRequirementDto)
        return plainToInstance(GetRequirementNameReponseDto, fieldData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/create-many')
    @Auth(AuthType.None)
    async createManyRequirement(@Body() createRequirementsDto: CreateRequirementDto[]) {
        const fieldData = await this.requirementsRepository.createManyRequirement(createRequirementsDto)
        return plainToInstance(GetRequirementNameReponseDto, fieldData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
