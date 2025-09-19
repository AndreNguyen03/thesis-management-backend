import { forwardRef, Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './providers/users.service'
import { AuthModule } from 'src/auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { CreateUserProvider } from './providers/create-user.provider'
import { FindOneUserByEmailProvider } from './providers/find-one-user-by-email.provider'
import profileConfig from './config/profile.config'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'

@Module({
    controllers: [UsersController],
    providers: [UsersService, CreateUserProvider, FindOneUserByEmailProvider],
    exports: [UsersService], // Export UsersService if you want to use it in other modules
    imports: [
        forwardRef(() => AuthModule),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        ConfigModule.forFeature(profileConfig)
    ] // Add any other modules that UsersService depends on here
})
export class UsersModule {}
