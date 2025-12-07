import { User } from '../../../users/schemas/users.schema'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { LecturerRoleEnum } from '../../registrations/enum/lecturer-role.enum'
import { GetMiniTopicInfo } from '../../topics/dtos'

export interface SendApprovalEmail {
    user: User
    topicInfo: GetMiniTopicInfo
    faculty: GetFacultyDto
    type: LecturerRoleEnum
}
