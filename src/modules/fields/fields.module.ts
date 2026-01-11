import { Module } from '@nestjs/common'
import { FieldsController } from './fields.controller'
import { FieldsService } from './application/fields.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Field, FieldSchema } from './schemas/fields.schemas'
import { FieldsRepository } from './repository/impl/fields.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'

@Module({
    imports: [MongooseModule.forFeature([{ name: Field.name, schema: FieldSchema }]), PaginationAnModule],
    controllers: [FieldsController],
    providers: [
        FieldsService,
        {
            provide: 'IFieldsRepository',
            useClass: FieldsRepository
        }
    ],
    exports: [FieldsService, 'IFieldsRepository']
})
export class FieldsModule {}
