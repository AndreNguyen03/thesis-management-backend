import { Module } from '@nestjs/common'
import { MajorsController } from './majors.controller'
import { MajorsService } from './application/majors.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Major, MajorSchema } from './schemas/majors.schemas'
import { MajorsRepository } from './repository/impl/majors.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'

@Module({
    controllers: [MajorsController],
    providers: [
        MajorsService,
        {
            provide: 'IMajorRepository',
            useClass: MajorsRepository
        }
    ],
    imports: [MongooseModule.forFeature([{ name: Major.name, schema: MajorSchema }]), PaginationAnModule]
})
export class MajorsModule {}
