import { Body, Controller, Post, Patch, UseInterceptors, ClassSerializerInterceptor, Get } from '@nestjs/common'
import { CreateUserDto } from './dtos/create-user.dto'
import { PatchUserDto } from './dtos/patch-user.dto'
import { UsersService } from './application/users.service'
import { ApiTags } from '@nestjs/swagger'
import { Auth } from 'src/auth/decorator/auth.decorator'
import { AuthType } from 'src/auth/enum/auth-type.enum'
import { ActiveUser } from 'src/auth/decorator/active-user.decorator'
import { ActiveUserData } from 'src/auth/interface/active-user-data.interface'

@Controller('users')
@ApiTags('Users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    @Auth(AuthType.Bearer)
    public async getUserProfile(@ActiveUser() user: ActiveUserData) {
        return this.usersService.findOneById(user.sub)
    }

    @Post()
    @Auth(AuthType.None)
    @UseInterceptors(ClassSerializerInterceptor)
    public createUser(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto)
    }

    @Patch()
    public patchUser(@Body() patchUserDto: PatchUserDto) {
        return 'you sent a patch request !'
    }
}
