import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class CreateDepartmentBoardDto {
    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsString()
    @IsNotEmpty()
    password: string

    readonly role: UserRole = UserRole.DEPARTMENT_BOARD
}
