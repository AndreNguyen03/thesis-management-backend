import { Expose, Transform, Type } from 'class-transformer'
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator'
export class StudentProjectDto {
    @Expose() title: string
    @Expose() description: string
    @Expose() technologies: string[]
}

export class CreateStudentDto {
    @Expose() fullName: string
    @Expose() class: string
    @Expose() major: string
    @Expose() email: string
    @Expose() password: string
    @Expose() phone: string

    readonly role: 'student' = 'student'
}

export class UpdateStudentDto {
    @IsOptional()
    @IsString()
    id?: string

    @IsOptional()
    @IsString()
    role?: 'student'

    @IsOptional()
    @IsString()
    fullName?: string

    @IsOptional()
    @IsString()
    class?: string

    @IsOptional()
    @IsString()
    major?: string

    @IsOptional()
    @IsString()
    email?: string

    @IsOptional()
    @IsString()
    phone?: string

    @IsOptional()
    @IsString()
    avatar?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsString()
    introduction?: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[]

    @IsOptional()
    @Type(() => StudentProjectDto)
    projects?: StudentProjectDto[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    subjects?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[]
}

export class StudentResponseDto {
    @Expose()
    @Transform(({ obj }) => obj._id.toString())
    id: string

    @Expose() fullName: string
    @Expose() class: string
    @Expose() major: string
    @Expose() email: string
    @Expose() phone: string
    @Expose() role: string
    @Expose() avatar: string
    @Expose() isActive: boolean
    @Expose() introduction: string
    @Expose() skills: string[]
    @Expose() subjects: string[]
    @Expose() interests: string[]

    @Expose()
    @ValidateNested({ each: true })
    @Type(() => StudentProjectDto)
    projects: StudentProjectDto[]
}
