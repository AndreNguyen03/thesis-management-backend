import { Body, Controller, Get, Post } from '@nestjs/common';
import { FieldService } from './application/field.service';
import { CreateFieldDto } from './dtos/field.dtos';

@Controller('field')
export class FieldController {
    constructor(
        private readonly fieldService: FieldService
    ) {}

    @Post('create-many-field') 
    async createManyField(@Body() fields: CreateFieldDto[]): Promise<{ success: boolean }> {
        const success = await this.fieldService.createManyFields(fields);
        return { success };
    }

    @Get()
    async getAllFields(){
        return this.fieldService.findAll();
    }
}
