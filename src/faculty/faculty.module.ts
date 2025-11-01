import { Module } from '@nestjs/common'
import { FacultyController } from './faculty.controller'
import { FacultyRepository } from './repository/impl/faculty.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Faculty, FacultysSchema } from './schemas/faculty.schema'
import { FacultyService } from './application/faculty.service'

@Module({
    imports: [MongooseModule.forFeature([{ name: Faculty.name, schema: FacultysSchema }])],
    controllers: [FacultyController],
    providers: [
        {
            provide: 'FacultyRepositoryInterface',
            useClass: FacultyRepository
        },
        FacultyService
    ],
    exports: [FacultyService]
})
export class FacultyModule {}
