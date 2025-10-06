import { forwardRef, Module } from '@nestjs/common'
import { ThesisController } from './thesis.controller'
import { ThesisRepository } from './repository/impl/thesis.repository'
import { ThesisService } from './application/thesis.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Thesis, ThesisSchema } from './schemas/thesis.schemas'
import { StudentRepository } from '../users/repository/impl/student.repository'
import { StudentService } from '../users/application/student.service'
import { Student, StudentSchema } from '../users/schemas/student.schema'
@Module({
    controllers: [ThesisController],
    providers: [
        ThesisService,
        {
            provide: 'ThesisRepositoryInterface',
            useClass: ThesisRepository
        }
    ],
    exports: [ThesisService],
    imports: [
        forwardRef(() => ThesisModule),
        MongooseModule.forFeature([{ name: Thesis.name, schema: ThesisSchema },{name:Student.name, schema: StudentSchema}]),
    ]
})
export class ThesisModule {}
