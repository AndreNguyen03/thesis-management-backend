import { Module } from '@nestjs/common'
import { FacultyService } from './application/faculty.service'
import { FacultyController } from './faculty.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Faculty, FacultySchema } from './schemas/faculty.schema'
import { FacultyRepository } from './repository/impl/faculty.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'

@Module({
    providers: [
        FacultyService,
        {
            provide: 'FacultyRepositoryInterface',
            useClass: FacultyRepository
        }
    ],
    controllers: [FacultyController],
    exports: [FacultyService, MongooseModule.forFeature([{ name: Faculty.name, schema: FacultySchema }])],
    imports: [MongooseModule.forFeature([{ name: Faculty.name, schema: FacultySchema }]), PaginationAnModule]
})
export class FacultyModule {}
