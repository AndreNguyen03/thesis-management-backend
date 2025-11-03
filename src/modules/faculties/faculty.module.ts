import { Module } from '@nestjs/common'
import { FacultyService } from './application/faculty.service'
import { FacultyController } from './faculty.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Faculty, FacultySchema } from './schemas/faculty.schema'
import { FacultyRepository } from './repository/impl/faculty.repository'

@Module({
    providers: [
        FacultyService,
        {
            provide: 'FacultyRepositoryInterface',
            useClass: FacultyRepository
        }
    ],
    controllers: [FacultyController],
    exports: [FacultyService],
    imports: [MongooseModule.forFeature([{ name: Faculty.name, schema: FacultySchema }])]
})
export class FacultyModule {}
