import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { FieldsService } from './application/fields.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { plainToInstance } from 'class-transformer'
import { GetFieldReponseDto, PaginatedFieldNameResponse } from './dtos/get-fields.dto'
import { CreateFieldDto } from './dtos/create-field.dto'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { fi } from '@faker-js/faker/.'

@Controller('fields')
export class FieldsController {
    constructor(private readonly fieldsService: FieldsService) {}
    @Get()
    @Auth(AuthType.None)
    async getAllFields(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const fieldData = await this.fieldsService.getAllFields(query)
        return plainToInstance(PaginatedFieldNameResponse, fieldData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/')
    @Auth(AuthType.None)
    async createField(@Body() createFieldDto: CreateFieldDto) {
        const fieldData = await this.fieldsService.createField(createFieldDto)
        return plainToInstance(GetFieldReponseDto, fieldData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
