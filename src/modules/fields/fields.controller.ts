import { Controller, Get, Req } from '@nestjs/common'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { FieldsService } from './application/fields.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { plainToInstance } from 'class-transformer'
import { GetFieldNameReponseDto } from './dtos/get-fields.dto'

@Controller('fields')
export class FieldsController {
    constructor(private readonly fieldsService: FieldsService) {}
    @Get()
    @Auth(AuthType.Bearer)
    async getAllFields(@Req() req: { user: ActiveUserData }) {
        const fieldData = await this.fieldsService.getAllFields()
        return plainToInstance(GetFieldNameReponseDto, fieldData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
