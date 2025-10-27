import { Module } from '@nestjs/common'
import { FieldsController } from './fields.controller'
import { FieldsService } from './application/fields.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Field, FieldSchema } from './schemas/fields.schemas'
import { FieldsRepository } from './repository/impl/fields.repository'

@Module({
    imports: [MongooseModule.forFeature([{ name: Field.name, schema: FieldSchema }])],
    controllers: [FieldsController],
    providers: [
        FieldsService,
        {
            provide: 'IFieldsRepository',
            useClass: FieldsRepository
        }
    ]
})
export class FieldsModule {}
