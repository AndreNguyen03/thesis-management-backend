import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { StudentRegistrationStatus } from '../enum/student-registration-status.enum'
import { StudentTopicRole } from '../schemas/ref_students_topics.schemas'

export class BodyReplyRegistrationDto {
    @IsNotEmpty()
    @IsString()
    @IsEnum(StudentRegistrationStatus)
    status: string
    @IsOptional()
    @IsString()
    lecturerResponse: string
    @IsOptional()
    @IsString()
    rejectionReasonType: string
    @IsOptional()
    @IsString()
    @IsEnum(StudentTopicRole)
    studentRole: string
}
