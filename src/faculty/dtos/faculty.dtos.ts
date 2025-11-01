import { IsEmail, IsString, IsUrl } from 'class-validator'

export class CreateFacultyDto {
    @IsString()
    name: string

    @IsEmail()
    email: string

    @IsUrl()
    @IsString()
    url: string
}
