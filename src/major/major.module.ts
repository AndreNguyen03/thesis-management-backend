import { Module } from '@nestjs/common'
import { MajorController } from './major.controller'
import { MajorRepository } from './repository/impl/major.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Major, MajorSchema } from './schemas/major.schema'
import { MajorService } from './application/major.service'

@Module({
    imports: [MongooseModule.forFeature([{ name: Major.name, schema: MajorSchema }])],
    controllers: [MajorController],
    providers: [
        {
            provide: 'MajorRepositoryInterface',
            useClass: MajorRepository
        },
        MajorService
    ],
    exports: [MajorService]
})
export class MajorModule {}
