import { Module } from '@nestjs/common';
import { FacultyService } from './application/faculty.service';
import { FacultyController } from './faculty.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Faculty, FacultySchema } from './schemas/faculty.schema';

@Module({
  providers: [FacultyService],
  controllers: [FacultyController],
  imports:[MongooseModule.forFeature([{name: Faculty.name,schema: FacultySchema}])],
})
export class FacultyModule {}
