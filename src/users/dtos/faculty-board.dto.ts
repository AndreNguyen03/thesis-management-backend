import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { CreateUserDto } from './create-user.dto'

export class CreateFacultyBoardDto extends CreateUserDto {
    @IsNotEmpty()
    @IsString()
    facultyId: string
}
