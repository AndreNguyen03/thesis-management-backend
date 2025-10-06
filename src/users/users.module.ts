import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import profileConfig from './config/profile.config'
import { MongooseModule } from '@nestjs/mongoose'
import { Student, StudentSchema } from './schemas/student.schema'
import { Lecturer, LecturerSchema } from './schemas/lecturer.schema'
import { Admin, AdminSchema } from './schemas/admin.schema'
import { AdminService } from './application/admin.service'
import { LecturerService } from './application/lecturer.service'
import { StudentService } from './application/student.service'
import { AdminRepository } from './repository/impl/admin.repository'
import { LecturerRepository } from './repository/impl/lecturer.repository'
import { StudentRepository } from './repository/impl/student.repository'
import { UserController } from './user.controller'
import { UserService } from './application/users.service'

@Module({
    controllers: [UserController],
    providers: [
        {
            provide: 'StudentRepositoryInterface',
            useClass: StudentRepository
        },
        {
            provide: 'LecturerRepositoryInterface',
            useClass: LecturerRepository
        },
        {
            provide: 'AdminRepositoryInterface',
            useClass: AdminRepository
        },
        StudentService,
        LecturerService,
        AdminService,
        UserService
    ],
    exports: [
        'StudentRepositoryInterface',
        'LecturerRepositoryInterface',
        'AdminRepositoryInterface',
        StudentService,
        LecturerService,
        AdminService,
        UserService
    ],
    imports: [
        forwardRef(() => AuthModule),
        MongooseModule.forFeature([
            { name: Student.name, schema: StudentSchema },
            { name: Lecturer.name, schema: LecturerSchema },
            { name: Admin.name, schema: AdminSchema }
        ]),
        ConfigModule.forFeature(profileConfig)
    ] // Add any other modules that UsersService depends on here
})
export class UsersModule {}
