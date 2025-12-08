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
import { User, UserSchema } from './schemas/users.schema'
import { UserRepository } from './repository/impl/user.repository'
import { FacultyBoardRepository } from './repository/impl/faculty-board.repository'
import { FacultyBoard, FacultyBoardSchema } from './schemas/faculty-board.schema'
import { FacultyBoardService } from './application/faculty-board.service'
import { UploadFilesModule } from '../modules/upload-files/upload-files.module'
import { GetFacultyByUserIdProvider } from './provider/get-facutly-by-userId.provider'
import { PaginationAnModule } from '../common/pagination-an/pagination.module'
import { CheckUserInfoProvider } from './provider/check-user-info.provider'
import { NotificationsModule } from '../modules/notifications/notifications.module'

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
        {
            provide: 'UserRepositoryInterface',
            useClass: UserRepository
        },
        {
            provide: 'FacultyBoardRepositoryInterface',
            useClass: FacultyBoardRepository
        },
        StudentService,
        LecturerService,
        AdminService,
        UserService,
        FacultyBoardService,
        GetFacultyByUserIdProvider,
        CheckUserInfoProvider
    ],
    exports: [
        'UserRepositoryInterface',
        'StudentRepositoryInterface',
        'LecturerRepositoryInterface',
        'AdminRepositoryInterface',
        'FacultyBoardRepositoryInterface',
        StudentService,
        LecturerService,
        AdminService,
        UserService,
        MongooseModule,
        GetFacultyByUserIdProvider,
        CheckUserInfoProvider
    ],
    imports: [
        forwardRef(() => AuthModule),
        MongooseModule.forFeature([
            { name: Student.name, schema: StudentSchema },
            { name: Lecturer.name, schema: LecturerSchema },
            { name: User.name, schema: UserSchema },
            { name: Admin.name, schema: AdminSchema },
            { name: FacultyBoard.name, schema: FacultyBoardSchema }
        ]),
        ConfigModule.forFeature(profileConfig),
        forwardRef(() => UploadFilesModule),
        forwardRef(() => PaginationAnModule)
    ] // Add any other modules that UsersService depends on here
})
export class UsersModule {}
