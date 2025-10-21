import { Module } from '@nestjs/common'
import { MajorsController } from './majors.controller'
import { Service } from './application/majors.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Major, MajorSchema } from './schemas/majors.schemas'

@Module({
    controllers: [MajorsController],
    providers: [Service],
    imports: [MongooseModule.forFeature([{ name: Major.name, schema: MajorSchema }])]
})
export class MajorsModule {}
