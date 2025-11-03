import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { plainToInstance } from 'class-transformer'
import { IRequirementsRepository } from './repository/requirements.repository.interface'
import { GetRequirementNameReponseDto } from './dtos/get-requirement.dto'
import { CreateRequirementDto } from './dtos/create-requirement.dto'
@Controller('requirements')
export class RequirementsController {
    constructor(@Inject('IRequirementsRepository') private readonly requirementsRepository: IRequirementsRepository) {}
    @Get()
    @Auth(AuthType.None)
    async getAllRequirements() {
        const requirementData = await this.requirementsRepository.getAllRequirements()
        return plainToInstance(GetRequirementNameReponseDto, requirementData, {
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
