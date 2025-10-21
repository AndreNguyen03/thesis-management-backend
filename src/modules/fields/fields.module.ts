import { Module } from '@nestjs/common'
import { FieldsController } from './fields.controller'
import { FieldsService } from './application/fields.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Field, FieldSchema } from './schemas/fields.schemas'

@Module({
    imports: [MongooseModule.forFeature([{ name: Field.name, schema: FieldSchema }])],
    controllers: [FieldsController],
    providers: [FieldsService]
})
export class FieldsModule {}
