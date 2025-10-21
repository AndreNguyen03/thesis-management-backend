import { IsNotEmpty, IsString } from "class-validator"

export class CreateRegistrationLecturerDto {
    @IsNotEmpty()
    @IsString()
    topicId: string

    @IsNotEmpty()
    @IsString({ each: true })
    lecturerIds: string[]
}
