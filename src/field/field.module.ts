import { Module } from '@nestjs/common'
import { FieldController } from './field.controller'
import { FieldRepository } from './repository/impl/field.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Field, FieldSchema } from './schemas/field.schema'
import { FieldService } from './application/field.service'

@Module({
    imports: [MongooseModule.forFeature([{ name: Field.name, schema: FieldSchema }])],
    controllers: [FieldController],
    providers: [
        {
            provide: 'FieldRepositoryInterface',
            useClass: FieldRepository
        },
        FieldService
    ],
    exports: [FieldService]
})
export class FieldModule {}
