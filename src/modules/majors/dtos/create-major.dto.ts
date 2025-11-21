import { IsNotEmpty } from "class-validator"

export class CreateMajorDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    facultyId: string
}